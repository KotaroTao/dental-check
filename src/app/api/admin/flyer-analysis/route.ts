import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

interface ChannelWithClinic {
  id: string;
  name: string;
  channelType: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  createdAt: Date;
  clinic: { id: string; name: string; slug: string };
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") || "365");
    // days=0 は「全期間」を意味する特殊値（過去すべての期間を集計）
    // それ以外は 1〜365 の範囲にクランプ
    const days = isNaN(rawDays) || rawDays < 0
      ? 365
      : rawDays === 0
      ? 0
      : Math.min(365, Math.max(1, rawDays));
    const methodFilter = searchParams.get("method") || "";

    // days=0 のときは startDate=null として全期間を対象にする
    const startDate = days === 0 ? null : new Date();
    if (startDate) {
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }
    const dateFilter = startDate ? { gte: startDate } : undefined;

    // 全チャネルを取得（クリニック情報付き、デモ・除外クリニックを除く）
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
        ...(methodFilter ? { distributionMethod: methodFilter } : {}),
        clinic: {
          excludeFromAnalysis: false,
          subscription: {
            planType: { not: "demo" },
          },
        },
      },
      include: {
        clinic: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const typedChannels = channels as ChannelWithClinic[];
    const channelIds = typedChannels.map((c) => c.id);

    // アクセスログを eventType 別に集計
    // - qr_scan   : QRをスキャンした瞬間（c/[code] のリダイレクトで記録、本来の指標）
    // - page_view : 診断ページに到達したアクセス（旧計測のフォールバック用）
    // qr_scan 計測導入前のチャネル/期間は qr_scan=0 になるため、page_view を実効スキャン数として補完する
    const accessCounts = channelIds.length > 0
      ? await prisma.accessLog.groupBy({
          by: ["channelId", "eventType"],
          where: {
            channelId: { in: channelIds },
            isDeleted: false,
            eventType: { in: ["qr_scan", "page_view"] },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _count: { id: true },
        })
      : [];

    const qrScanMap: Record<string, number> = {};
    const pageViewMap: Record<string, number> = {};
    for (const ac of accessCounts) {
      if (!ac.channelId) continue;
      if (ac.eventType === "qr_scan") qrScanMap[ac.channelId] = ac._count.id;
      else if (ac.eventType === "page_view") pageViewMap[ac.channelId] = ac._count.id;
    }

    // チャネルごとの分析データを構築
    const channelAnalysis = typedChannels.map((ch) => {
      const qrScans = qrScanMap[ch.id] || 0;
      // qr_scan 計測前のフォールバック（診断ページ到達数を実効スキャンとして扱う）
      const fallbackScans = pageViewMap[ch.id] || 0;
      const effectiveScans = qrScans > 0 ? qrScans : fallbackScans;

      const quantity = ch.distributionQuantity;
      const budget = ch.budget;

      return {
        id: ch.id,
        clinicId: ch.clinic.id,
        clinicName: ch.clinic.name,
        clinicSlug: ch.clinic.slug,
        name: ch.name,
        channelType: ch.channelType,
        imageUrl: ch.imageUrl,
        imageUrl2: ch.imageUrl2,
        distributionMethod: ch.distributionMethod,
        distributionQuantity: quantity,
        distributionPeriod: ch.distributionPeriod,
        budget: budget,

        // 生のカウント
        qrScans,                // 真のQRスキャン数（qr_scanイベントの件数）
        scans: effectiveScans,  // 実効スキャン数（qr_scan が無ければ page_view にフォールバック）

        // 算出指標
        // QRスキャン率 = QRスキャン ÷ 配布枚数
        qrScanRate: quantity && quantity > 0
          ? Math.round((effectiveScans / quantity) * 10000) / 100
          : null,
        // QRスキャン単価 = 予算 ÷ QRスキャン
        qrScanCost: budget && effectiveScans > 0 ? Math.round(budget / effectiveScans) : null,
        createdAt: ch.createdAt,
      };
    });

    // 配布方法別の集計（QRスキャン率・QRスキャン単価の比較に使用）
    const methodSummary: Record<
      string,
      {
        count: number;
        totalQrScans: number;
        totalScans: number; // 実効スキャン数
        totalQuantity: number;
        totalBudget: number;
      }
    > = {};
    for (const ch of channelAnalysis) {
      const method = ch.distributionMethod || "未設定";
      if (!methodSummary[method]) {
        methodSummary[method] = {
          count: 0,
          totalQrScans: 0,
          totalScans: 0,
          totalQuantity: 0,
          totalBudget: 0,
        };
      }
      const m = methodSummary[method];
      m.count++;
      m.totalQrScans += ch.qrScans;
      m.totalScans += ch.scans;
      m.totalQuantity += ch.distributionQuantity || 0;
      m.totalBudget += ch.budget || 0;
    }

    // 「未設定」は分析対象として意味が薄いので比較統計から除外
    const methodStats = Object.entries(methodSummary)
      .filter(([method]) => method !== "未設定")
      .map(([method, data]) => ({
        method,
        count: data.count,
        totalScans: data.totalScans,
        totalQrScans: data.totalQrScans,
        totalQuantity: data.totalQuantity,
        totalBudget: data.totalBudget,
        // QRスキャン率: スキャン数 / 配布枚数
        avgQrScanRate: data.totalQuantity > 0
          ? Math.round((data.totalScans / data.totalQuantity) * 10000) / 100
          : null,
        // QRスキャン単価: 予算 / スキャン数
        avgQrScanCost: data.totalBudget > 0 && data.totalScans > 0
          ? Math.round(data.totalBudget / data.totalScans)
          : null,
      }));

    return NextResponse.json({
      channels: channelAnalysis,
      methodStats,
      period: days,
    });
  } catch (error) {
    console.error("Get flyer analysis error:", error);
    return NextResponse.json(
      { error: "QR効果分析の取得に失敗しました" },
      { status: 500 }
    );
  }
}
