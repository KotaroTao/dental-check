import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LocationRecord {
  region: string | null;
  city: string | null;
  town: string | null;
  latitude: number | null;
  longitude: number | null;
  channelId: string | null;
}

interface AggregatedLocation {
  region: string | null;
  city: string | null;
  town: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
  channelId: string | null;
}

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

    // 位置情報付きの診断セッションを取得
    const sessions = await prisma.diagnosisSession.findMany({
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
      select: {
        region: true,
        city: true,
        town: true,
        latitude: true,
        longitude: true,
        channelId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 町丁目レベルで集計（座標は最初のレコードを使用）
    const locationMap = new Map<string, AggregatedLocation>();

    for (const s of sessions as LocationRecord[]) {
      const key = `${s.region}-${s.city}-${s.town || "notown"}-${s.channelId || "nochannel"}`;

      if (!locationMap.has(key)) {
        locationMap.set(key, {
          region: s.region,
          city: s.city,
          town: s.town,
          latitude: s.latitude,
          longitude: s.longitude,
          count: 0,
          channelId: s.channelId,
        });
      }

      const loc = locationMap.get(key)!;
      loc.count++;

      // 座標がない場合は更新
      if (loc.latitude === null && s.latitude !== null) {
        loc.latitude = s.latitude;
        loc.longitude = s.longitude;
      }
    }

    // 配列に変換してソート
    const locations = Array.from(locationMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // 上位50件

    // 都道府県別の集計
    const regionMap = new Map<string, number>();
    for (const s of sessions) {
      if (s.region) {
        regionMap.set(s.region, (regionMap.get(s.region) || 0) + 1);
      }
    }

    const topRegions = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

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
