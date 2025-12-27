import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") || "30");
    // バリデーション: 1〜365日の範囲に制限
    const days = Math.max(1, Math.min(365, isNaN(rawDays) ? 30 : rawDays));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 全体統計を取得
    const [
      totalSessions,
      completedSessions,
      diagnosisTypes,
      dailyStats,
      resultDistribution,
      ageDistribution,
      genderDistribution,
      ctaStats,
    ] = await Promise.all([
      // 総セッション数
      prisma.diagnosisSession.count({
        where: { createdAt: { gte: startDate } },
      }),
      // 完了セッション数
      prisma.diagnosisSession.count({
        where: {
          createdAt: { gte: startDate },
          completedAt: { not: null },
        },
      }),
      // 診断タイプ別統計
      getDiagnosisTypeStats(startDate),
      // 日別統計
      getDailyStats(startDate, days),
      // 結果カテゴリ分布
      getResultDistribution(startDate),
      // 年齢分布
      getAgeDistribution(startDate),
      // 性別分布
      getGenderDistribution(startDate),
      // CTAクリック統計
      getCTAStats(startDate),
    ]);

    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    return NextResponse.json({
      overview: {
        totalSessions,
        completedSessions,
        completionRate,
        period: days,
      },
      diagnosisTypes,
      dailyStats,
      resultDistribution,
      ageDistribution,
      genderDistribution,
      ctaStats,
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return NextResponse.json(
      { error: "統計の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 診断タイプ別統計
async function getDiagnosisTypeStats(startDate: Date) {
  const types = await prisma.diagnosisType.findMany({
    include: {
      sessions: {
        where: {
          createdAt: { gte: startDate },
          completedAt: { not: null },
        },
        select: {
          totalScore: true,
        },
      },
      _count: {
        select: {
          sessions: {
            where: {
              createdAt: { gte: startDate },
              completedAt: { not: null },
            },
          },
        },
      },
    },
  });

  return types.map((type: typeof types[number]) => {
    const scores = type.sessions
      .map((s: { totalScore: number | null }) => s.totalScore)
      .filter((s: number | null): s is number => s !== null);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

    return {
      id: type.id,
      slug: type.slug,
      name: type.name,
      count: type._count.sessions,
      avgScore,
    };
  });
}

// 日別統計
async function getDailyStats(startDate: Date, days: number) {
  const sessions = await prisma.diagnosisSession.findMany({
    where: { createdAt: { gte: startDate } },
    select: {
      createdAt: true,
      completedAt: true,
    },
  });

  const dailyMap = new Map<
    string,
    { date: string; started: number; completed: number }
  >();

  // 日付を初期化
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailyMap.set(dateStr, { date: dateStr, started: 0, completed: 0 });
  }

  // セッションを集計
  sessions.forEach((session: { createdAt: Date; completedAt: Date | null }) => {
    const dateStr = session.createdAt.toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr);
    if (entry) {
      entry.started++;
      if (session.completedAt) {
        entry.completed++;
      }
    }
  });

  return Array.from(dailyMap.values()).reverse();
}

// 結果カテゴリ分布
async function getResultDistribution(startDate: Date) {
  const sessions = await prisma.diagnosisSession.groupBy({
    by: ["resultCategory"],
    where: {
      createdAt: { gte: startDate },
      completedAt: { not: null },
      resultCategory: { not: null },
    },
    _count: true,
  });

  return sessions.map((s: { resultCategory: string | null; _count: number }) => ({
    category: s.resultCategory || "不明",
    count: s._count,
  }));
}

// 年齢分布
async function getAgeDistribution(startDate: Date) {
  const sessions = await prisma.diagnosisSession.findMany({
    where: {
      createdAt: { gte: startDate },
      completedAt: { not: null },
      userAge: { not: null },
    },
    select: { userAge: true },
  });

  const ageGroups = {
    "〜19歳": 0,
    "20〜29歳": 0,
    "30〜39歳": 0,
    "40〜49歳": 0,
    "50〜59歳": 0,
    "60歳〜": 0,
  };

  sessions.forEach((session: { userAge: number | null }) => {
    const age = session.userAge!;
    if (age < 20) ageGroups["〜19歳"]++;
    else if (age < 30) ageGroups["20〜29歳"]++;
    else if (age < 40) ageGroups["30〜39歳"]++;
    else if (age < 50) ageGroups["40〜49歳"]++;
    else if (age < 60) ageGroups["50〜59歳"]++;
    else ageGroups["60歳〜"]++;
  });

  return Object.entries(ageGroups).map(([group, count]) => ({
    group,
    count,
  }));
}

// 性別分布
async function getGenderDistribution(startDate: Date) {
  const sessions = await prisma.diagnosisSession.groupBy({
    by: ["userGender"],
    where: {
      createdAt: { gte: startDate },
      completedAt: { not: null },
      userGender: { not: null },
    },
    _count: true,
  });

  const genderLabels: Record<string, string> = {
    male: "男性",
    female: "女性",
    other: "その他",
  };

  return sessions.map((s: { userGender: string | null; _count: number }) => ({
    gender: genderLabels[s.userGender || ""] || s.userGender || "不明",
    count: s._count,
  }));
}

// CTAクリック統計
async function getCTAStats(startDate: Date) {
  const clicks = await prisma.cTAClick.groupBy({
    by: ["ctaType"],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  const ctaLabels: Record<string, string> = {
    booking: "Web予約",
    phone: "電話",
    line: "LINE",
    instagram: "Instagram",
    clinic_page: "医院ページ",
  };

  return clicks.map((c: { ctaType: string; _count: number }) => ({
    type: ctaLabels[c.ctaType] || c.ctaType,
    count: c._count,
  }));
}
