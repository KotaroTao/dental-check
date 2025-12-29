import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LocationGroupResult = {
  region: string | null;
  city: string | null;
  town: string | null;
  channelId: string | null;
  _count: { id: number };
};

type RegionGroupResult = {
  region: string | null;
  _count: { id: number };
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const channelIds = searchParams.get("channelIds"); // カンマ区切りの複数チャンネルID
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

    // 町丁目別の診断完了数を集計（チャンネル別）
    // 注: 緯度経度は保存していないため、region/city/townで集計
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
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20, // 上位20件
    });

    // 都道府県別の集計
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

    // レスポンス形式に変換（緯度経度は含まない）
    const locations = (locationData as LocationGroupResult[]).map((item) => ({
      region: item.region,
      city: item.city,
      town: item.town,
      count: item._count.id,
      channelId: item.channelId,
    }));

    const topRegions = (regionData as RegionGroupResult[]).map((item) => ({
      region: item.region,
      count: item._count.id,
    }));

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
