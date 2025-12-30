import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forwardGeocode } from "@/lib/geocoding";
import type { ClinicPage } from "@/types/clinic";

interface LocationGroupResult {
  region: string | null;
  city: string | null;
  town: string | null;
  channelId: string | null;
  _count: { id: number };
  _avg: { latitude: number | null; longitude: number | null };
}

interface AccessLogGroupResult {
  region: string | null;
  city: string | null;
  channelId: string | null;
  _count: { id: number };
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

    // レスポンス形式に変換（診断セッション）
    const diagnosisLocations = (locationData as LocationGroupResult[]).map((item) => ({
      region: item.region,
      city: item.city,
      town: item.town,
      latitude: item._avg.latitude,
      longitude: item._avg.longitude,
      count: item._count.id,
      channelId: item.channelId,
      type: "diagnosis" as const,
    }));

    // QRスキャン（リンクタイプ）のエリアデータを取得
    const qrScanData = await prisma.accessLog.groupBy({
      by: ["region", "city", "channelId"],
      where: {
        clinicId: session.clinicId,
        eventType: "qr_scan",
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
      take: 100,
    });

    // QRスキャンデータを統合形式に変換
    const qrScanLocations = (qrScanData as AccessLogGroupResult[]).map((item) => ({
      region: item.region,
      city: item.city,
      town: null,
      latitude: null,
      longitude: null,
      count: item._count.id,
      channelId: item.channelId,
      type: "qr_scan" as const,
    }));

    // 両方のデータを統合
    const locations = [...diagnosisLocations, ...qrScanLocations];

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

    // QRスキャンの都道府県別集計
    const qrScanRegionData = await prisma.accessLog.groupBy({
      by: ["region"],
      where: {
        clinicId: session.clinicId,
        eventType: "qr_scan",
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
    });

    // 都道府県別データを統合
    const regionMap: Record<string, number> = {};
    for (const item of regionData as RegionGroupResult[]) {
      if (item.region) {
        regionMap[item.region] = (regionMap[item.region] || 0) + item._count.id;
      }
    }
    for (const item of qrScanRegionData as RegionGroupResult[]) {
      if (item.region) {
        regionMap[item.region] = (regionMap[item.region] || 0) + item._count.id;
      }
    }
    const topRegions = Object.entries(regionMap)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    // 全体の件数（診断 + QRスキャン）
    const [diagnosisTotal, qrScanTotal] = await Promise.all([
      prisma.diagnosisSession.count({
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
      }),
      prisma.accessLog.count({
        where: {
          clinicId: session.clinicId,
          eventType: "qr_scan",
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          ...channelFilter,
        },
      }),
    ]);
    const total = diagnosisTotal + qrScanTotal;

    // クリニックの住所から座標を取得
    let clinicCenter: { latitude: number; longitude: number } | null = null;
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: session.clinicId },
        select: { clinicPage: true },
      });

      if (clinic?.clinicPage) {
        const clinicPage = clinic.clinicPage as ClinicPage;
        const address = clinicPage.access?.address;
        if (address) {
          const coords = await forwardGeocode(address);
          if (coords) {
            clinicCenter = {
              latitude: coords.latitude,
              longitude: coords.longitude,
            };
          }
        }
      }
    } catch (error) {
      console.error("Failed to get clinic center:", error);
      // エラーがあってもnullのまま続行
    }

    return NextResponse.json({
      locations,
      topRegions,
      total,
      clinicCenter,
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
