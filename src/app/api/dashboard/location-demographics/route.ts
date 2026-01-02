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
    const region = searchParams.get("region");
    const city = searchParams.get("city");
    const town = searchParams.get("town");
    const channelIds = searchParams.get("channelIds");
    const period = searchParams.get("period") || "month";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!region || !city) {
      return NextResponse.json({ error: "region and city are required" }, { status: 400 });
    }

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

    // チャンネルフィルター条件
    const channelFilter = channelIds
      ? { channelId: { in: channelIds.split(",").filter(Boolean) } }
      : {};

    // 地域フィルター条件
    const locationFilter = town
      ? { region, city, town }
      : { region, city };

    // 共通のwhere条件
    const whereCondition = {
      clinicId: session.clinicId,
      completedAt: { not: null },
      isDemo: false,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...locationFilter,
      ...channelFilter,
    };

    // 性別統計を取得
    const genderStats = await prisma.diagnosisSession.groupBy({
      by: ["userGender"],
      where: whereCondition,
      _count: { id: true },
    });

    // 年齢データを取得
    const sessions = await prisma.diagnosisSession.findMany({
      where: whereCondition,
      select: { userAge: true },
    });

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

    // 年齢層統計を計算（10歳刻み、0-9から80+まで）
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

    for (const s of sessions) {
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

    const total = sessions.length;

    return NextResponse.json({
      genderByType,
      ageRanges,
      total,
    });
  } catch (error) {
    console.error("Location demographics error:", error);
    return NextResponse.json(
      { error: "人口統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
