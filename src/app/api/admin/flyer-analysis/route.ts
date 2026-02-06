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
  budget: number | null;
  createdAt: Date;
  clinic: { name: string; slug: string };
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") || "90");
    const days = Math.max(1, Math.min(365, isNaN(rawDays) ? 90 : rawDays));
    const methodFilter = searchParams.get("method") || "";

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 全チャネルを取得（クリニック情報付き）
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
        ...(methodFilter ? { distributionMethod: methodFilter } : {}),
      },
      include: {
        clinic: {
          select: { name: true, slug: true },
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
              createdAt: { gte: startDate },
            },
            _count: { id: true },
          })
        : [],
      channelIds.length > 0
        ? prisma.cTAClick.groupBy({
            by: ["channelId"],
            where: {
              channelId: { in: channelIds },
              createdAt: { gte: startDate },
            },
            _count: { id: true },
          })
        : [],
    ]);

    // アクセスログ（スキャン数）を取得
    const accessCounts = channelIds.length > 0
      ? await prisma.accessLog.groupBy({
          by: ["channelId"],
          where: {
            channelId: { in: channelIds },
            isDeleted: false,
            createdAt: { gte: startDate },
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

    const accessCountMap: Record<string, number> = {};
    for (const ac of accessCounts) {
      if (ac.channelId) accessCountMap[ac.channelId] = ac._count.id;
    }

    // チャネルごとの分析データを構築
    const channelAnalysis = typedChannels.map((ch) => {
      const scans = accessCountMap[ch.id] || 0;
      const completions = sessionCountMap[ch.id] || 0;
      const ctaClicks = ctaCountMap[ch.id] || 0;
      const quantity = ch.distributionQuantity;
      const budget = ch.budget;

      return {
        id: ch.id,
        clinicName: ch.clinic.name,
        clinicSlug: ch.clinic.slug,
        name: ch.name,
        channelType: ch.channelType,
        imageUrl: ch.imageUrl,
        imageUrl2: ch.imageUrl2,
        distributionMethod: ch.distributionMethod,
        distributionQuantity: quantity,
        budget: budget,
        scans,
        completions,
        ctaClicks,
        // 算出指標
        responseRate: quantity && quantity > 0 ? Math.round((scans / quantity) * 10000) / 100 : null,
        completionRate: scans > 0 ? Math.round((completions / scans) * 10000) / 100 : null,
        ctaRate: completions > 0 ? Math.round((ctaClicks / completions) * 10000) / 100 : null,
        costPerScan: budget && scans > 0 ? Math.round(budget / scans) : null,
        costPerCta: budget && ctaClicks > 0 ? Math.round(budget / ctaClicks) : null,
        createdAt: ch.createdAt,
      };
    });

    // 配布方法別の集計
    const methodSummary: Record<string, { count: number; totalScans: number; totalCompletions: number; totalCtaClicks: number; totalQuantity: number; totalBudget: number }> = {};
    for (const ch of channelAnalysis) {
      const method = ch.distributionMethod || "未設定";
      if (!methodSummary[method]) {
        methodSummary[method] = { count: 0, totalScans: 0, totalCompletions: 0, totalCtaClicks: 0, totalQuantity: 0, totalBudget: 0 };
      }
      const m = methodSummary[method];
      m.count++;
      m.totalScans += ch.scans;
      m.totalCompletions += ch.completions;
      m.totalCtaClicks += ch.ctaClicks;
      m.totalQuantity += ch.distributionQuantity || 0;
      m.totalBudget += ch.budget || 0;
    }

    const methodStats = Object.entries(methodSummary).map(([method, data]) => ({
      method,
      count: data.count,
      totalScans: data.totalScans,
      totalCompletions: data.totalCompletions,
      totalCtaClicks: data.totalCtaClicks,
      avgResponseRate: data.totalQuantity > 0 ? Math.round((data.totalScans / data.totalQuantity) * 10000) / 100 : null,
      avgCompletionRate: data.totalScans > 0 ? Math.round((data.totalCompletions / data.totalScans) * 10000) / 100 : null,
      avgCtaRate: data.totalCompletions > 0 ? Math.round((data.totalCtaClicks / data.totalCompletions) * 10000) / 100 : null,
      avgCostPerScan: data.totalBudget > 0 && data.totalScans > 0 ? Math.round(data.totalBudget / data.totalScans) : null,
    }));

    return NextResponse.json({
      channels: channelAnalysis,
      methodStats,
      period: days,
    });
  } catch (error) {
    console.error("Get flyer analysis error:", error);
    return NextResponse.json(
      { error: "チラシ効果分析の取得に失敗しました" },
      { status: 500 }
    );
  }
}
