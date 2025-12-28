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

    // CTAクリックを日別に取得
    const ctaClicks = await prisma.cTAClick.findMany({
      where: {
        clinicId: session.clinicId,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...(channelId && { channelId }),
      },
      select: {
        createdAt: true,
        channelId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 日別に集計
    const dailyData: Record<string, { count: number; fromResult: number; fromClinicPage: number }> = {};

    // 期間内のすべての日付を初期化
    const currentDate = new Date(dateFrom);
    while (currentDate <= dateTo) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailyData[dateKey] = { count: 0, fromResult: 0, fromClinicPage: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // クリックを集計
    for (const click of ctaClicks) {
      const dateKey = click.createdAt.toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].count++;
        if (click.channelId) {
          dailyData[dateKey].fromResult++;
        } else {
          dailyData[dateKey].fromClinicPage++;
        }
      }
    }

    // 配列に変換
    const data = Object.entries(dailyData).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("CTA chart data error:", error);
    return NextResponse.json(
      { error: "CTAチャートデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
