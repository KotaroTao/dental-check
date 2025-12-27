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
    const [accessCount, completedCount, ctaCount, channels] = await Promise.all([
      // アクセス数
      prisma.accessLog.count({
        where: baseFilter,
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

      // CTAクリック数
      prisma.cTAClick.count({
        where: baseFilter,
      }),

      // 経路一覧（フィルター用）
      prisma.channel.findMany({
        where: { clinicId: session.clinicId },
        select: { id: true, name: true, diagnosisTypeSlug: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 完了率を計算
    const completionRate =
      accessCount > 0 ? Math.round((completedCount / accessCount) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      stats: {
        accessCount,
        completedCount,
        completionRate,
        ctaCount,
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
