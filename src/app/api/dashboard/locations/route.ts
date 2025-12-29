import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LocationGroupResult {
  region: string | null;
  city: string | null;
  town: string | null;
  channelId: string | null;
  _count: { id: number };
  _avg: { latitude: number | null; longitude: number | null };
}

interface RegionGroupResult {
  region: string | null;
  _count: { id: number };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const channelIds = searchParams.get("channelIds");
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

    // チャンネルフィルター条件を作成
    const channelFilter = channelIds
      ? { channelId: { in: channelIds.split(",").filter(Boolean) } }
      : channelId
      ? { channelId }
      : {};

    // DB側でGROUP BY集計（パフォーマンス改善）
    const locationData = await prisma.diagnosisSession.groupBy({
      by: ["region", "city", "town", "channelId"],
      where: {
        clinicId: session.clinicId,
        completedAt: { not: null },
        isDemo: false,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        region: { not: null },
        city: { not: null },
        ...channelFilter,
      },
      _count: {
        id: true,
      },
      _avg: {
        latitude: true,
        longitude: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 100, // 上位100件に制限
    });

    // レスポンス形式に変換
    const locations = (locationData as LocationGroupResult[]).map((item) => ({
      region: item.region,
      city: item.city,
      town: item.town,
      latitude: item._avg.latitude,
      longitude: item._avg.longitude,
      count: item._count.id,
      channelId: item.channelId,
    }));

    // 都道府県別の集計（DB側で実行）
    const regionData = await prisma.diagnosisSession.groupBy({
      by: ["region"],
      where: {
        clinicId: session.clinicId,
        completedAt: { not: null },
        isDemo: false,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        region: { not: null },
        ...channelFilter,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    const topRegions = (regionData as RegionGroupResult[]).map((item) => ({
      region: item.region,
      count: item._count.id,
    }));

    // 全体の件数
    const total = await prisma.diagnosisSession.count({
      where: {
        clinicId: session.clinicId,
        completedAt: { not: null },
        isDemo: false,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...channelFilter,
      },
    });

    return NextResponse.json({
      locations,
      topRegions,
      total,
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard locations error:", error);
    return NextResponse.json(
      { error: "位置データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
