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
    const period = searchParams.get("period") || "month"; // today, week, month, custom
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

    // 共通のフィルター条件
    const baseFilter = {
      clinicId: session.clinicId,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(channelId && { channelId }),
    };

    // 統計データを並行取得
    const [
      accessCount,
      completedCount,
      ctaClicks,
      channels,
      clinicPageViews,
      ctaFromResult,
      ctaFromClinicPage,
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
        where: {
          clinicId: session.clinicId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          ...(channelId && { channelId }),
          isDemo: false,
          completedAt: { not: null },
        },
      }),

      // CTAクリック（タイプ別に集計）
      prisma.cTAClick.groupBy({
        by: ['ctaType'],
        where: baseFilter,
        _count: { id: true },
      }),

      // 経路一覧（フィルター用）
      prisma.channel.findMany({
        where: { clinicId: session.clinicId },
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
    ]);

    // CTAクリックをタイプ別に整理
    const ctaByType: Record<string, number> = {};
    let ctaCount = 0;
    for (const cta of ctaClicks) {
      ctaByType[cta.ctaType] = cta._count.id;
      ctaCount += cta._count.id;
    }

    // 完了率を計算
    const completionRate =
      accessCount > 0 ? Math.round((completedCount / accessCount) * 100 * 10) / 10 : 0;

    // コンバージョン率を計算
    // 診断結果→CTAのコンバージョン率
    const resultConversionRate =
      completedCount > 0 ? Math.round((ctaFromResult / completedCount) * 100 * 10) / 10 : 0;

    // 医院紹介ページ→CTAのコンバージョン率
    const clinicPageConversionRate =
      clinicPageViews > 0 ? Math.round((ctaFromClinicPage / clinicPageViews) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      stats: {
        accessCount,
        completedCount,
        completionRate,
        ctaCount,
        ctaByType,
        // コンバージョン関連
        clinicPageViews,
        ctaFromResult,
        ctaFromClinicPage,
        resultConversionRate,
        clinicPageConversionRate,
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
