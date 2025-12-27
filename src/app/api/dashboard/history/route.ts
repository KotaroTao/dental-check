import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "矯正チェック",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const diagnosisType = searchParams.get("diagnosisType");
    const period = searchParams.get("period") || "month";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // フィルター条件
    const whereFilter: {
      clinicId: string;
      isDemo: boolean;
      completedAt: { not: null };
      createdAt: { gte: Date; lte: Date };
      channelId?: string;
      diagnosisType?: { slug: string };
    } = {
      clinicId: session.clinicId,
      isDemo: false,
      completedAt: { not: null },
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (channelId) {
      whereFilter.channelId = channelId;
    }

    if (diagnosisType) {
      whereFilter.diagnosisType = { slug: diagnosisType };
    }

    // 総件数と履歴データを並行取得
    const [totalCount, sessions] = await Promise.all([
      prisma.diagnosisSession.count({
        where: whereFilter,
      }),
      prisma.diagnosisSession.findMany({
        where: whereFilter,
        include: {
          channel: {
            select: { id: true, name: true },
          },
          diagnosisType: {
            select: { slug: true, name: true },
          },
          ctaClicks: {
            select: { ctaType: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);

    // CTAクリックタイプの表示名
    const CTA_TYPE_NAMES: Record<string, string> = {
      booking: "予約クリック",
      phone: "電話クリック",
      line: "LINEクリック",
      instagram: "Instagramクリック",
      clinic_page: "医院ページクリック",
    };

    // 履歴データを整形
    type SessionWithRelations = {
      id: string;
      createdAt: Date;
      resultCategory: string | null;
      channel: { id: string; name: string } | null;
      diagnosisType: { slug: string; name: string } | null;
      ctaClicks: { ctaType: string }[];
    };

    const history = (sessions as SessionWithRelations[]).map((s) => {
      const ctaClick = s.ctaClicks[0];
      return {
        id: s.id,
        createdAt: s.createdAt,
        diagnosisType: s.diagnosisType?.name || DIAGNOSIS_TYPE_NAMES[s.diagnosisType?.slug || ""] || "不明",
        diagnosisTypeSlug: s.diagnosisType?.slug,
        channelName: s.channel?.name || "不明",
        channelId: s.channel?.id,
        resultCategory: s.resultCategory || "-",
        ctaType: ctaClick ? CTA_TYPE_NAMES[ctaClick.ctaType] || ctaClick.ctaType : null,
      };
    });

    return NextResponse.json({
      history,
      totalCount,
      hasMore: offset + limit < totalCount,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Dashboard history error:", error);
    return NextResponse.json(
      { error: "履歴データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
