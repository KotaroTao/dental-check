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
    // 期間フィルタを Prisma where 句で再利用するためのヘルパー
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

    // 各チャネルの診断完了数・CTAクリック数を一括取得
    const [sessionCounts, ctaCounts] = await Promise.all([
      channelIds.length > 0
        ? prisma.diagnosisSession.groupBy({
            by: ["channelId"],
            where: {
              channelId: { in: channelIds },
              isDeleted: false,
              isDemo: false,
              completedAt: { not: null },
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            _count: { id: true },
          })
        : [],
      channelIds.length > 0
        ? prisma.cTAClick.groupBy({
            by: ["channelId"],
            where: {
              channelId: { in: channelIds },
              isDeleted: false,
              ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            _count: { id: true },
          })
        : [],
    ]);

    // アクセスログを eventType 別に集計
    // - qr_scan      : QRをスキャンした瞬間（c/[code] のリダイレクトで記録、本来の「反応」）
    // - page_view    : 診断ページに到達したアクセス（プロフィール入力後）
    // 両者を分けて取り、スキャン→診断到達→完了→CTA のファネルが見えるようにする
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

    // マップに変換
    const sessionCountMap: Record<string, number> = {};
    for (const sc of sessionCounts) {
      if (sc.channelId) sessionCountMap[sc.channelId] = sc._count.id;
    }

    const ctaCountMap: Record<string, number> = {};
    for (const cc of ctaCounts) {
      if (cc.channelId) ctaCountMap[cc.channelId] = cc._count.id;
    }

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
      const diagnosisStarts = pageViewMap[ch.id] || 0;
      const completions = sessionCountMap[ch.id] || 0;
      const ctaClicks = ctaCountMap[ch.id] || 0;

      // 後方互換: qr_scan が記録されていない期間/チャネルのフォールバック
      // - 診断付きQR: 診断ページ到達数（page_view）を実効スキャンとして扱う
      // - リンク型QR : リンクページにはpage_view計測がないため ctaClicks を実効スキャンとして扱う
      //   （link-completeで1スキャン=1CTAが必ず作成されるため、CTA数=有効スキャン数）
      // 計測修正のリリース後、新しいスキャンはすべて qr_scan で記録される
      const fallbackScans =
        ch.channelType === "link" ? ctaClicks : diagnosisStarts;
      const effectiveScans = qrScans > 0 ? qrScans : fallbackScans;

      const quantity = ch.distributionQuantity;
      const budget = ch.budget;

      // ファネル各ステップの率
      // diagnosis到達率 = qr_scanしたうち、診断ページまで進んだ割合
      const diagnosisStartRate =
        qrScans > 0 ? Math.round((diagnosisStarts / qrScans) * 10000) / 100 : null;

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
        qrScans,                // 真のQRスキャン数
        diagnosisStarts,        // 診断ページ到達数（旧 scans 相当）
        scans: effectiveScans,  // 後方互換: 既存UIが参照する想定
        completions,
        ctaClicks,

        // 算出指標
        // 配布反応率 = 真のスキャン数 / 配布枚数（過去データは page_view にフォールバック）
        responseRate: quantity && quantity > 0
          ? Math.round((effectiveScans / quantity) * 10000) / 100
          : null,
        // 診断到達率 = QRスキャン → 診断ページ到達 の割合（プロフィール脱落の指標）
        diagnosisStartRate,
        // 完了率 = 診断到達 → 完了 の割合（既存定義のまま）
        completionRate: diagnosisStarts > 0
          ? Math.round((completions / diagnosisStarts) * 10000) / 100
          : null,
        // CTA率 = 完了 → CTAクリック
        ctaRate: completions > 0
          ? Math.round((ctaClicks / completions) * 10000) / 100
          : null,
        // 全体CV率 = QRスキャン → CTAクリック（経営判断向け、ファネル全体）
        overallCvRate: effectiveScans > 0
          ? Math.round((ctaClicks / effectiveScans) * 10000) / 100
          : null,

        costPerScan: budget && effectiveScans > 0 ? Math.round(budget / effectiveScans) : null,
        costPerCta: budget && ctaClicks > 0 ? Math.round(budget / ctaClicks) : null,
        createdAt: ch.createdAt,
      };
    });

    // 配布方法別の集計
    // ファネル各段階を合算して、配布方法ごとの「平均像」を出す
    const methodSummary: Record<
      string,
      {
        count: number;
        totalQrScans: number;
        totalScans: number; // 実効スキャン数（後方互換含む）
        totalDiagnosisStarts: number;
        totalCompletions: number;
        totalCtaClicks: number;
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
          totalDiagnosisStarts: 0,
          totalCompletions: 0,
          totalCtaClicks: 0,
          totalQuantity: 0,
          totalBudget: 0,
        };
      }
      const m = methodSummary[method];
      m.count++;
      m.totalQrScans += ch.qrScans;
      m.totalScans += ch.scans;
      m.totalDiagnosisStarts += ch.diagnosisStarts;
      m.totalCompletions += ch.completions;
      m.totalCtaClicks += ch.ctaClicks;
      m.totalQuantity += ch.distributionQuantity || 0;
      m.totalBudget += ch.budget || 0;
    }

    // 「未設定」は分析対象として意味が薄いので比較統計から除外する
    // （フロントの比較チャートとも条件を合わせる）
    const methodStats = Object.entries(methodSummary)
      .filter(([method]) => method !== "未設定")
      .map(([method, data]) => ({
      method,
      count: data.count,
      totalScans: data.totalScans,
      totalQrScans: data.totalQrScans,
      totalDiagnosisStarts: data.totalDiagnosisStarts,
      totalCompletions: data.totalCompletions,
      totalCtaClicks: data.totalCtaClicks,
      // 配布反応率: スキャン数 / 配布枚数
      avgResponseRate: data.totalQuantity > 0
        ? Math.round((data.totalScans / data.totalQuantity) * 10000) / 100
        : null,
      // 診断到達率: スキャン → 診断ページ
      avgDiagnosisStartRate: data.totalQrScans > 0
        ? Math.round((data.totalDiagnosisStarts / data.totalQrScans) * 10000) / 100
        : null,
      // 完了率: 診断到達 → 完了
      avgCompletionRate: data.totalDiagnosisStarts > 0
        ? Math.round((data.totalCompletions / data.totalDiagnosisStarts) * 10000) / 100
        : null,
      // CTA率: 完了 → CTAクリック
      avgCtaRate: data.totalCompletions > 0
        ? Math.round((data.totalCtaClicks / data.totalCompletions) * 10000) / 100
        : null,
      // 全体CV率: スキャン → CTAクリック
      avgOverallCvRate: data.totalScans > 0
        ? Math.round((data.totalCtaClicks / data.totalScans) * 10000) / 100
        : null,
      avgCostPerScan: data.totalBudget > 0 && data.totalScans > 0
        ? Math.round(data.totalBudget / data.totalScans)
        : null,
      avgCostPerCta: data.totalBudget > 0 && data.totalCtaClicks > 0
        ? Math.round(data.totalBudget / data.totalCtaClicks)
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
