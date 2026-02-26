import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 共有ダッシュボードのデータを取得（認証不要、トークンで医院を特定）
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // トークンから医院を取得
    const clinic = await prisma.clinic.findUnique({
      where: { shareToken: token },
      select: { id: true, name: true, logoUrl: true, mainColor: true },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: "無効な共有リンクです" },
        { status: 404 }
      );
    }

    const clinicId = clinic.id;

    const { searchParams } = new URL(request.url);
    const VALID_PERIODS = ["today", "week", "month", "all", "custom"];
    const period = VALID_PERIODS.includes(searchParams.get("period") || "")
      ? searchParams.get("period")!
      : "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const channelIdsParam = searchParams.get("channelIds");

    const selectedChannelIds = channelIdsParam
      ? channelIdsParam.split(",").filter((id) => id.trim())
      : [];

    // 期間の計算
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (period === "all") {
      // 全期間
    } else if (period === "custom" && startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
      dateTo.setHours(23, 59, 59, 999);
    } else {
      dateTo = new Date();
      switch (period) {
        case "today":
          dateFrom = new Date();
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case "week":
          dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - 7);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case "month":
        default:
          dateFrom = new Date();
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          dateFrom.setHours(0, 0, 0, 0);
          break;
      }
    }

    // チャンネル一覧を取得
    const channels = await prisma.channel.findMany({
      where: { clinicId, isActive: true },
      select: {
        id: true,
        name: true,
        channelType: true,
        diagnosisTypeSlug: true,
        budget: true,
        distributionMethod: true,
        distributionQuantity: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const activeChannelIds = channels.map((c: { id: string }) => c.id);

    // チャンネルフィルター
    let channelFilter: { channelId?: string | { in: string[] } } = {};
    if (selectedChannelIds.length > 0) {
      const filteredIds = selectedChannelIds.filter((id) =>
        activeChannelIds.includes(id)
      );
      if (filteredIds.length > 0) {
        channelFilter = { channelId: { in: filteredIds } };
      }
    } else if (activeChannelIds.length > 0) {
      channelFilter = { channelId: { in: activeChannelIds } };
    }

    const dateFilter = dateFrom && dateTo
      ? { createdAt: { gte: dateFrom, lte: dateTo } }
      : {};

    const completedFilter = {
      clinicId,
      ...dateFilter,
      ...channelFilter,
      isDemo: false,
      isDeleted: false,
      completedAt: { not: null as null },
    };

    // 統計データを並行取得
    const [
      accessCount,
      completedCount,
      ctaClicks,
      genderStats,
      completedSessions,
      sessionsWithCategory,
      ctaClicksWithSession,
      // チャンネル別統計
      channelAccessCounts,
      channelCtaCounts,
    ] = await Promise.all([
      // QR読込数
      prisma.diagnosisSession.count({
        where: {
          clinicId,
          isDeleted: false,
          isDemo: false,
          completedAt: { not: null },
          ...dateFilter,
          ...channelFilter,
        },
      }),

      // 診断完了数
      prisma.diagnosisSession.count({
        where: completedFilter,
      }),

      // CTAクリック（タイプ別）
      prisma.cTAClick.groupBy({
        by: ["ctaType"],
        where: {
          clinicId,
          ...dateFilter,
          ...channelFilter,
          OR: [
            { sessionId: null },
            { session: { isDeleted: false } },
          ],
        },
        _count: { id: true },
      }),

      // 性別統計
      prisma.diagnosisSession.groupBy({
        by: ["userGender"],
        where: completedFilter,
        _count: { id: true },
      }),

      // 年齢データ
      prisma.diagnosisSession.findMany({
        where: completedFilter,
        select: { userAge: true },
      }),

      // 結果カテゴリ別セッション数
      prisma.diagnosisSession.groupBy({
        by: ["resultCategory"],
        where: completedFilter,
        _count: { id: true },
      }),

      // セッションに紐づくCTAクリック
      prisma.cTAClick.findMany({
        where: {
          clinicId,
          ...dateFilter,
          ...channelFilter,
          sessionId: { not: null },
          session: { isDeleted: false },
        },
        select: {
          sessionId: true,
          session: { select: { resultCategory: true } },
        },
      }),

      // チャンネル別アクセス数
      prisma.diagnosisSession.groupBy({
        by: ["channelId"],
        where: {
          clinicId,
          isDeleted: false,
          isDemo: false,
          completedAt: { not: null },
          ...dateFilter,
          channelId: { in: activeChannelIds },
        },
        _count: { id: true },
      }),

      // チャンネル別CTAクリック数
      prisma.cTAClick.groupBy({
        by: ["channelId"],
        where: {
          clinicId,
          ...dateFilter,
          channelId: { in: activeChannelIds },
          OR: [
            { sessionId: null },
            { session: { isDeleted: false } },
          ],
        },
        _count: { id: true },
      }),
    ]);

    // CTAクリックをタイプ別に整理
    const ctaByType: Record<string, number> = {};
    let ctaCount = 0;
    for (const cta of ctaClicks) {
      ctaByType[cta.ctaType] = cta._count.id;
      ctaCount += cta._count.id;
    }

    // 性別統計
    const genderByType: Record<string, number> = { male: 0, female: 0, other: 0 };
    for (const stat of genderStats) {
      if (stat.userGender && stat.userGender in genderByType) {
        genderByType[stat.userGender] = stat._count.id;
      }
    }

    // 年齢層統計
    const ageRanges: Record<string, number> = {
      "0-9": 0, "10-19": 0, "20-29": 0, "30-39": 0,
      "40-49": 0, "50-59": 0, "60-69": 0, "70-79": 0, "80+": 0,
    };
    for (const s of completedSessions) {
      const age = s.userAge;
      if (age !== null) {
        if (age < 10) ageRanges["0-9"]++;
        else if (age < 20) ageRanges["10-19"]++;
        else if (age < 30) ageRanges["20-29"]++;
        else if (age < 40) ageRanges["30-39"]++;
        else if (age < 50) ageRanges["40-49"]++;
        else if (age < 60) ageRanges["50-59"]++;
        else if (age < 70) ageRanges["60-69"]++;
        else if (age < 80) ageRanges["70-79"]++;
        else ageRanges["80+"]++;
      }
    }

    // 結果カテゴリ別統計
    const categoryStats: Record<string, { count: number; ctaCount: number; ctaRate: number }> = {};
    for (const stat of sessionsWithCategory) {
      const category = stat.resultCategory || "未分類";
      categoryStats[category] = { count: stat._count.id, ctaCount: 0, ctaRate: 0 };
    }
    for (const click of ctaClicksWithSession) {
      const category = click.session?.resultCategory || "未分類";
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, ctaCount: 0, ctaRate: 0 };
      }
      categoryStats[category].ctaCount++;
    }
    for (const category of Object.keys(categoryStats)) {
      const stat = categoryStats[category];
      stat.ctaRate = stat.count > 0
        ? Math.round((stat.ctaCount / stat.count) * 100 * 10) / 10
        : 0;
    }

    // CTA率
    const ctaRate = completedCount > 0
      ? Math.round((ctaCount / completedCount) * 100 * 10) / 10
      : 0;

    // チャンネル別の統計をまとめる
    const channelAccessMap: Record<string, number> = {};
    for (const item of channelAccessCounts) {
      if (item.channelId) channelAccessMap[item.channelId] = item._count.id;
    }
    const channelCtaMap: Record<string, number> = {};
    for (const item of channelCtaCounts) {
      if (item.channelId) channelCtaMap[item.channelId] = item._count.id;
    }

    const channelsWithStats = channels.map((ch: typeof channels[number]) => {
      const access = channelAccessMap[ch.id] || 0;
      const cta = channelCtaMap[ch.id] || 0;
      return {
        ...ch,
        accessCount: access,
        ctaCount: cta,
        ctaRate: access > 0 ? Math.round((cta / access) * 100 * 10) / 10 : 0,
        costPerAccess: ch.budget && access > 0
          ? Math.round(ch.budget / access)
          : null,
      };
    });

    return NextResponse.json({
      clinic: {
        name: clinic.name,
        logoUrl: clinic.logoUrl,
        mainColor: clinic.mainColor,
      },
      stats: {
        accessCount,
        completedCount,
        completionRate: accessCount > 0
          ? Math.round((completedCount / accessCount) * 100 * 10) / 10
          : 0,
        ctaCount,
        ctaRate,
        ctaByType,
        categoryStats,
        genderByType,
        ageRanges,
      },
      channels: channelsWithStats,
    });
  } catch (error) {
    console.error("Shared dashboard error:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
