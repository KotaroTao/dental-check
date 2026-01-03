import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const channelIdsParam = searchParams.get("channelIds"); // カンマ区切りで複数指定可能
    const period = searchParams.get("period") || "month"; // today, week, month, custom
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 複数のチャンネルIDを配列に変換
    const selectedChannelIds = channelIdsParam
      ? channelIdsParam.split(",").filter((id) => id.trim())
      : [];

    // 期間の計算
    let dateFrom: Date;
    const dateTo = new Date();
    let prevDateFrom: Date;
    let prevDateTo: Date;

    if (period === "custom" && startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo.setTime(new Date(endDate).getTime());
      dateTo.setHours(23, 59, 59, 999);
      // カスタム期間の場合、同じ日数だけ前の期間を計算
      const durationMs = dateTo.getTime() - dateFrom.getTime();
      prevDateTo = new Date(dateFrom.getTime() - 1);
      prevDateFrom = new Date(prevDateTo.getTime() - durationMs);
    } else {
      switch (period) {
        case "today":
          dateFrom = new Date();
          dateFrom.setHours(0, 0, 0, 0);
          // 前日
          prevDateTo = new Date(dateFrom.getTime() - 1);
          prevDateFrom = new Date(prevDateTo);
          prevDateFrom.setHours(0, 0, 0, 0);
          break;
        case "week":
          dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - 7);
          dateFrom.setHours(0, 0, 0, 0);
          // 前週
          prevDateTo = new Date(dateFrom.getTime() - 1);
          prevDateFrom = new Date(prevDateTo);
          prevDateFrom.setDate(prevDateFrom.getDate() - 7);
          prevDateFrom.setHours(0, 0, 0, 0);
          break;
        case "month":
        default:
          dateFrom = new Date();
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          dateFrom.setHours(0, 0, 0, 0);
          // 前月
          prevDateTo = new Date(dateFrom.getTime() - 1);
          prevDateFrom = new Date(prevDateTo);
          prevDateFrom.setMonth(prevDateFrom.getMonth() - 1);
          prevDateFrom.setHours(0, 0, 0, 0);
          break;
      }
    }

    // アクティブなチャンネルIDを取得（非表示チャンネルを統計から除外するため）
    const activeChannels = await prisma.channel.findMany({
      where: { clinicId: session.clinicId, isActive: true },
      select: { id: true, channelType: true },
    });
    const activeChannelIds = activeChannels.map((c: { id: string }) => c.id);
    // リンクのみタイプのチャンネルID
    const linkOnlyChannelIds = activeChannels
      .filter((c: { id: string; channelType: string }) => c.channelType === "link")
      .map((c: { id: string }) => c.id);

    // チャンネルフィルター（特定チャンネル指定時はそれを使用、なければアクティブチャンネルのみ）
    let channelFilter: { channelId?: string | { in: string[] } } = {};
    if (channelId) {
      // 単一チャンネル指定
      channelFilter = { channelId };
    } else if (selectedChannelIds.length > 0) {
      // 複数チャンネル指定（アクティブチャンネルのみに絞る）
      const filteredIds = selectedChannelIds.filter((id) => activeChannelIds.includes(id));
      if (filteredIds.length > 0) {
        channelFilter = { channelId: { in: filteredIds } };
      }
    } else if (activeChannelIds.length > 0) {
      // デフォルト: すべてのアクティブチャンネル
      channelFilter = { channelId: { in: activeChannelIds } };
    }

    // フィルター適用後のリンクのみタイプのチャンネルIDを計算
    let filteredLinkOnlyChannelIds: string[] = [];
    if (channelId) {
      // 単一チャンネル指定の場合
      if (linkOnlyChannelIds.includes(channelId)) {
        filteredLinkOnlyChannelIds = [channelId];
      }
    } else if (selectedChannelIds.length > 0) {
      // 複数チャンネル指定の場合
      filteredLinkOnlyChannelIds = selectedChannelIds.filter((id) => linkOnlyChannelIds.includes(id));
    } else {
      // デフォルト: すべてのリンクのみタイプチャンネル
      filteredLinkOnlyChannelIds = linkOnlyChannelIds;
    }

    // 共通のフィルター条件
    const baseFilter = {
      clinicId: session.clinicId,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...channelFilter,
    };

    // 前期の共通フィルター条件
    const prevBaseFilter = {
      clinicId: session.clinicId,
      createdAt: {
        gte: prevDateFrom,
        lte: prevDateTo,
      },
      ...channelFilter,
    };

    // 診断完了者のフィルター条件
    const completedFilter = {
      clinicId: session.clinicId,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...channelFilter,
      isDemo: false,
      completedAt: { not: null },
    };

    // 前期の診断完了者のフィルター条件
    const prevCompletedFilter = {
      clinicId: session.clinicId,
      createdAt: {
        gte: prevDateFrom,
        lte: prevDateTo,
      },
      ...channelFilter,
      isDemo: false,
      completedAt: { not: null },
    };

    // リンクのみタイプの診断完了フィルター（完了率100%、CTA=1として計算するため）
    const linkOnlyCompletedFilter = filteredLinkOnlyChannelIds.length > 0
      ? {
          clinicId: session.clinicId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          channelId: { in: filteredLinkOnlyChannelIds },
          isDemo: false,
          completedAt: { not: null },
        }
      : null;

    // 統計データを並行取得（現期間 + 前期間）
    const [
      accessCount,
      completedCount,
      ctaClicks,
      channels,
      clinicPageViews,
      ctaFromResult,
      ctaFromClinicPage,
      genderStats,
      completedSessions,
      // 結果カテゴリ別統計
      sessionsWithCategory,
      ctaClicksWithSession,
      // 前期データ
      prevAccessCount,
      prevCompletedCount,
      prevCtaCount,
      // リンクのみタイプの診断完了数
      linkOnlyCompletedCount,
    ] = await Promise.all([
      // アクセス数（診断ページ）
      prisma.accessLog.count({
        where: {
          ...baseFilter,
          eventType: { not: "clinic_page_view" },
        },
      }),

      // 診断完了数
      prisma.diagnosisSession.count({
        where: completedFilter,
      }),

      // CTAクリック（タイプ別に集計）
      prisma.cTAClick.groupBy({
        by: ['ctaType'],
        where: baseFilter,
        _count: { id: true },
      }),

      // QRコード一覧（フィルター用、アクティブのみ）
      prisma.channel.findMany({
        where: { clinicId: session.clinicId, isActive: true },
        select: { id: true, name: true, diagnosisTypeSlug: true },
        orderBy: { createdAt: "desc" },
      }),

      // 医院紹介ページの閲覧数
      prisma.accessLog.count({
        where: {
          clinicId: session.clinicId,
          eventType: "clinic_page_view",
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      }),

      // 診断結果からのCTAクリック（channelIdがある）
      prisma.cTAClick.count({
        where: {
          ...baseFilter,
          channelId: { not: null },
        },
      }),

      // 医院紹介ページからのCTAクリック（channelIdがない）
      prisma.cTAClick.count({
        where: {
          clinicId: session.clinicId,
          channelId: null,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      }),

      // 性別統計
      prisma.diagnosisSession.groupBy({
        by: ['userGender'],
        where: completedFilter,
        _count: { id: true },
      }),

      // 年齢データを取得（年齢層統計用）
      prisma.diagnosisSession.findMany({
        where: completedFilter,
        select: { userAge: true },
      }),

      // 結果カテゴリ別セッション数
      prisma.diagnosisSession.groupBy({
        by: ['resultCategory'],
        where: completedFilter,
        _count: { id: true },
      }),

      // セッションに紐づくCTAクリック（結果カテゴリ別CTA率計算用）
      prisma.cTAClick.findMany({
        where: {
          ...baseFilter,
          sessionId: { not: null },
        },
        select: {
          sessionId: true,
          session: {
            select: { resultCategory: true },
          },
        },
      }),

      // --- 前期データ ---
      // 前期アクセス数
      prisma.accessLog.count({
        where: {
          ...prevBaseFilter,
          eventType: { not: "clinic_page_view" },
        },
      }),

      // 前期診断完了数
      prisma.diagnosisSession.count({
        where: prevCompletedFilter,
      }),

      // 前期CTAクリック数
      prisma.cTAClick.count({
        where: prevBaseFilter,
      }),

      // リンクのみタイプの診断完了数（完了率100%、CTA=1として計算するため）
      linkOnlyCompletedFilter
        ? prisma.diagnosisSession.count({
            where: linkOnlyCompletedFilter,
          })
        : Promise.resolve(0),
    ]);

    // CTAクリックをタイプ別に整理
    const ctaByType: Record<string, number> = {};
    let ctaCount = 0;
    for (const cta of ctaClicks) {
      ctaByType[cta.ctaType] = cta._count.id;
      ctaCount += cta._count.id;
    }

    // リンクのみタイプの診断完了はCTAとしてカウント（QRリンクとして内訳に追加）
    if (linkOnlyCompletedCount > 0) {
      ctaByType["qr_link"] = linkOnlyCompletedCount;
    }
    ctaCount += linkOnlyCompletedCount;

    // リンクのみタイプの診断完了はアクセス数にも加算（完了率100%を実現）
    const adjustedAccessCount = accessCount + linkOnlyCompletedCount;

    // 完了率を計算
    const completionRate =
      adjustedAccessCount > 0 ? Math.round((completedCount / adjustedAccessCount) * 100 * 10) / 10 : 0;

    // コンバージョン率を計算
    // 診断結果→CTAのコンバージョン率
    const resultConversionRate =
      completedCount > 0 ? Math.round((ctaFromResult / completedCount) * 100 * 10) / 10 : 0;

    // 医院紹介ページ→CTAのコンバージョン率
    const clinicPageConversionRate =
      clinicPageViews > 0 ? Math.round((ctaFromClinicPage / clinicPageViews) * 100 * 10) / 10 : 0;

    // 性別統計を整理
    const genderByType: Record<string, number> = {
      male: 0,
      female: 0,
      other: 0,
    };
    for (const stat of genderStats) {
      if (stat.userGender && genderByType.hasOwnProperty(stat.userGender)) {
        genderByType[stat.userGender] = stat._count.id;
      }
    }

    // 年齢層統計を計算（LocationSectionと同じラベルを使用）
    const ageRanges: Record<string, number> = {
      "0-9": 0,
      "10-19": 0,
      "20-29": 0,
      "30-39": 0,
      "40-49": 0,
      "50-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80+": 0,
    };
    for (const session of completedSessions) {
      const age = session.userAge;
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

    // 結果カテゴリ別統計を計算
    const categoryStats: Record<string, { count: number; ctaCount: number; ctaRate: number }> = {};

    // カテゴリ別セッション数を集計
    for (const stat of sessionsWithCategory) {
      const category = stat.resultCategory || "未分類";
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, ctaCount: 0, ctaRate: 0 };
      }
      categoryStats[category].count = stat._count.id;
    }

    // カテゴリ別CTAクリック数を集計
    for (const click of ctaClicksWithSession) {
      const category = click.session?.resultCategory || "未分類";
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, ctaCount: 0, ctaRate: 0 };
      }
      categoryStats[category].ctaCount++;
    }

    // カテゴリ別CTA率を計算
    for (const category of Object.keys(categoryStats)) {
      const stat = categoryStats[category];
      stat.ctaRate = stat.count > 0
        ? Math.round((stat.ctaCount / stat.count) * 100 * 10) / 10
        : 0;
    }

    // トレンド計算（前期比の変化率）
    // isNew: 前期が0で今期にデータがある場合（新規データ）
    const calcTrend = (current: number, previous: number): { value: number; isNew: boolean } => {
      if (previous === 0) {
        return { value: current > 0 ? 100 : 0, isNew: current > 0 };
      }
      return { value: Math.round(((current - previous) / previous) * 100), isNew: false };
    };

    const trends = {
      accessCount: calcTrend(adjustedAccessCount, prevAccessCount),
      completedCount: calcTrend(completedCount, prevCompletedCount),
      ctaCount: calcTrend(ctaCount, prevCtaCount),
    };

    // CTA率（診断完了者ベース）
    const ctaRate = completedCount > 0
      ? Math.round((ctaCount / completedCount) * 100 * 10) / 10
      : 0;

    return NextResponse.json({
      stats: {
        accessCount: adjustedAccessCount,
        completedCount,
        completionRate,
        ctaCount,
        ctaRate,
        ctaByType,
        // コンバージョン関連
        clinicPageViews,
        ctaFromResult,
        ctaFromClinicPage,
        resultConversionRate,
        clinicPageConversionRate,
        // 結果カテゴリ別統計
        categoryStats,
        // 年齢・性別統計
        genderByType,
        ageRanges,
        // 前期比トレンド
        trends,
        prevPeriod: {
          accessCount: prevAccessCount,
          completedCount: prevCompletedCount,
          ctaCount: prevCtaCount,
        },
      },
      channels,
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
