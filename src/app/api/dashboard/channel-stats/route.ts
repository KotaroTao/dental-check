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
    const period = searchParams.get("period") || "month";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 期間の計算
    let dateFrom: Date;
    const dateTo = new Date();

    if (period === "custom" && startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo.setTime(new Date(endDate).getTime());
      dateTo.setHours(23, 59, 59, 999);
    } else {
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

    // アクティブなチャンネルを取得（広告設定も含む）
    const channels = await prisma.channel.findMany({
      where: { clinicId: session.clinicId, isActive: true },
      select: {
        id: true,
        adBudget: true,
        adStartDate: true,
        adEndDate: true,
        adPlacement: true,
      },
    });

    const channelIds = channels.map((c: { id: string }) => c.id);

    // 広告設定をチャンネルIDでマップ化
    const channelAdData: Record<string, {
      adBudget: number | null;
      adStartDate: Date | null;
      adEndDate: Date | null;
      adPlacement: string | null;
    }> = {};
    for (const channel of channels as { id: string; adBudget: number | null; adStartDate: Date | null; adEndDate: Date | null; adPlacement: string | null }[]) {
      channelAdData[channel.id] = {
        adBudget: channel.adBudget,
        adStartDate: channel.adStartDate,
        adEndDate: channel.adEndDate,
        adPlacement: channel.adPlacement,
      };
    }

    if (channelIds.length === 0) {
      return NextResponse.json({ stats: {} });
    }

    // 各チャンネルの統計を取得
    const [
      accessCounts,
      completedCounts,
      ctaCounts,
      ctaByChannel,
      genderByChannel,
      ageByChannel,
      accessLogs,
    ] = await Promise.all([
      // アクセス数（チャンネル別）
      prisma.accessLog.groupBy({
        by: ["channelId"],
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
          eventType: { not: "clinic_page_view" },
        },
        _count: { id: true },
      }),

      // 診断完了数（チャンネル別）
      prisma.diagnosisSession.groupBy({
        by: ["channelId"],
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
          isDemo: false,
          completedAt: { not: null },
        },
        _count: { id: true },
      }),

      // CTAクリック数（チャンネル別）
      prisma.cTAClick.groupBy({
        by: ["channelId"],
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        _count: { id: true },
      }),

      // CTA内訳（チャンネル・タイプ別）
      prisma.cTAClick.groupBy({
        by: ["channelId", "ctaType"],
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        _count: { id: true },
      }),

      // 性別統計（チャンネル別）
      prisma.diagnosisSession.groupBy({
        by: ["channelId", "userGender"],
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
          isDemo: false,
          completedAt: { not: null },
        },
        _count: { id: true },
      }),

      // 年齢データ（チャンネル別）
      prisma.diagnosisSession.findMany({
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
          isDemo: false,
          completedAt: { not: null },
        },
        select: { channelId: true, userAge: true },
      }),

      // アクセスログ（日付別集計用）
      prisma.accessLog.findMany({
        where: {
          clinicId: session.clinicId,
          channelId: { in: channelIds },
          createdAt: { gte: dateFrom, lte: dateTo },
          eventType: { not: "clinic_page_view" },
        },
        select: { channelId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 期間ラベル生成関数
    const formatPeriodLabel = (startDate: Date | null, endDate: Date | null): string => {
      const formatDate = (date: Date) => {
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
      };

      if (!startDate && !endDate) {
        return "無期限";
      } else if (startDate && !endDate) {
        return `${formatDate(startDate)}〜`;
      } else if (!startDate && endDate) {
        return `〜${formatDate(endDate)}`;
      } else if (startDate && endDate) {
        return `${formatDate(startDate)}〜${formatDate(endDate)}`;
      }
      return "無期限";
    };

    // 統計データを整理
    const stats: Record<string, {
      accessCount: number;
      completedCount: number;
      completionRate: number;
      ctaCount: number;
      ctaRate: number;
      ctaByType: Record<string, number>;
      genderByType: Record<string, number>;
      ageRanges: Record<string, number>;
      accessByDate: { date: string; count: number }[];
      // 広告効果測定メトリクス
      adBudget: number | null;
      adStartDate: string | null;
      adEndDate: string | null;
      adPlacement: string | null;
      adDays: number | null;
      dailyCost: number | null;
      cpa: number | null;  // Cost per Access
      cpd: number | null;  // Cost per Diagnosis completion
      cpc: number | null;  // Cost per CTA Click
      // 期間ラベル
      periodLabel: string;
    }> = {};

    // 初期化
    for (const channelId of channelIds) {
      const adData = channelAdData[channelId];
      stats[channelId] = {
        accessCount: 0,
        completedCount: 0,
        completionRate: 0,
        ctaCount: 0,
        ctaRate: 0,
        ctaByType: {},
        genderByType: { male: 0, female: 0, other: 0 },
        ageRanges: { "~19": 0, "20-29": 0, "30-39": 0, "40-49": 0, "50-59": 0, "60~": 0 },
        accessByDate: [],
        // 広告効果測定メトリクス（初期値）
        adBudget: adData.adBudget,
        adStartDate: adData.adStartDate?.toISOString() || null,
        adEndDate: adData.adEndDate?.toISOString() || null,
        adPlacement: adData.adPlacement,
        adDays: null,
        dailyCost: null,
        cpa: null,
        cpd: null,
        cpc: null,
        // 期間ラベル
        periodLabel: formatPeriodLabel(adData.adStartDate, adData.adEndDate),
      };
    }

    // アクセス数
    for (const item of accessCounts) {
      if (item.channelId && stats[item.channelId]) {
        stats[item.channelId].accessCount = item._count.id;
      }
    }

    // 診断完了数
    for (const item of completedCounts) {
      if (item.channelId && stats[item.channelId]) {
        stats[item.channelId].completedCount = item._count.id;
      }
    }

    // CTAクリック数
    for (const item of ctaCounts) {
      if (item.channelId && stats[item.channelId]) {
        stats[item.channelId].ctaCount = item._count.id;
      }
    }

    // CTA内訳
    for (const item of ctaByChannel) {
      if (item.channelId && stats[item.channelId]) {
        stats[item.channelId].ctaByType[item.ctaType] = item._count.id;
      }
    }

    // 性別統計
    for (const item of genderByChannel) {
      if (item.channelId && item.userGender && stats[item.channelId]) {
        stats[item.channelId].genderByType[item.userGender] = item._count.id;
      }
    }

    // 年齢層統計
    for (const session of ageByChannel) {
      if (session.channelId && session.userAge !== null && stats[session.channelId]) {
        const age = session.userAge;
        if (age < 20) stats[session.channelId].ageRanges["~19"]++;
        else if (age < 30) stats[session.channelId].ageRanges["20-29"]++;
        else if (age < 40) stats[session.channelId].ageRanges["30-39"]++;
        else if (age < 50) stats[session.channelId].ageRanges["40-49"]++;
        else if (age < 60) stats[session.channelId].ageRanges["50-59"]++;
        else stats[session.channelId].ageRanges["60~"]++;
      }
    }

    // 完了率・CTA率・広告効果指標を計算
    for (const channelId of channelIds) {
      const s = stats[channelId];

      // 完了率
      s.completionRate = s.accessCount > 0
        ? Math.round((s.completedCount / s.accessCount) * 100 * 10) / 10
        : 0;

      // CTA率（診断完了者のうちCTAをクリックした割合）
      s.ctaRate = s.completedCount > 0
        ? Math.round((s.ctaCount / s.completedCount) * 100 * 10) / 10
        : 0;

      // 広告効果測定指標
      if (s.adBudget && s.adBudget > 0) {
        // 広告掲載日数を計算
        if (s.adStartDate && s.adEndDate) {
          const start = new Date(s.adStartDate);
          const end = new Date(s.adEndDate);
          s.adDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          // 1日あたりコスト
          s.dailyCost = Math.round(s.adBudget / s.adDays);
        }

        // CPA (Cost per Access): アクセス1件あたりのコスト
        if (s.accessCount > 0) {
          s.cpa = Math.round(s.adBudget / s.accessCount);
        }

        // CPD (Cost per Diagnosis): 診断完了1件あたりのコスト
        if (s.completedCount > 0) {
          s.cpd = Math.round(s.adBudget / s.completedCount);
        }

        // CPC (Cost per Click): CTAクリック1件あたりのコスト
        if (s.ctaCount > 0) {
          s.cpc = Math.round(s.adBudget / s.ctaCount);
        }
      }
    }

    // 日付別アクセス数を集計（直近10日分のみ）
    const accessByDateMap: Record<string, Record<string, number>> = {};
    for (const channelId of channelIds) {
      accessByDateMap[channelId] = {};
    }
    for (const log of accessLogs) {
      if (log.channelId && accessByDateMap[log.channelId]) {
        const dateKey = log.createdAt.toISOString().split("T")[0];
        accessByDateMap[log.channelId][dateKey] = (accessByDateMap[log.channelId][dateKey] || 0) + 1;
      }
    }
    for (const channelId of channelIds) {
      const dateMap = accessByDateMap[channelId];
      const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
      stats[channelId].accessByDate = sortedDates.slice(0, 10).map((date) => ({
        date,
        count: dateMap[date],
      }));
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Channel stats error:", error);
    return NextResponse.json(
      { error: "チャンネル統計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
