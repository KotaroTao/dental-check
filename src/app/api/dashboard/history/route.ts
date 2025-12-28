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

    // アクティブなチャンネルIDを取得（非表示チャンネルを除外）
    const activeChannels = await prisma.channel.findMany({
      where: { clinicId: session.clinicId, isActive: true },
      select: { id: true },
    });
    const activeChannelIds = activeChannels.map((c: { id: string }) => c.id);

    // フィルター条件
    type WhereFilterType = {
      clinicId: string;
      isDemo: boolean;
      completedAt: { not: null };
      createdAt: { gte: Date; lte: Date };
      channelId?: string | { in: string[] };
      diagnosisType?: { slug: string };
    };

    const whereFilter: WhereFilterType = {
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
    } else if (activeChannelIds.length > 0) {
      // 特定チャンネル指定がない場合、アクティブチャンネルのみ
      whereFilter.channelId = { in: activeChannelIds };
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
          },
          _count: {
            select: { ctaClicks: true },
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

    // 性別の表示名
    const GENDER_NAMES: Record<string, string> = {
      male: "男性",
      female: "女性",
      other: "-",
    };

    // 履歴データを整形
    type SessionWithRelations = {
      id: string;
      createdAt: Date;
      userAge: number | null;
      userGender: string | null;
      resultCategory: string | null;
      region: string | null;
      city: string | null;
      channel: { id: string; name: string } | null;
      diagnosisType: { slug: string; name: string } | null;
      ctaClicks: { ctaType: string }[];
      _count: { ctaClicks: number };
    };

    const history = (sessions as SessionWithRelations[]).map((s) => {
      // CTA内訳を集計
      const ctaByType: Record<string, number> = {};
      for (const click of s.ctaClicks) {
        ctaByType[click.ctaType] = (ctaByType[click.ctaType] || 0) + 1;
      }

      // エリア情報を整形（都道府県 + 市区町村）
      let area = "-";
      if (s.region && s.city) {
        area = `${s.region} ${s.city}`;
      } else if (s.region) {
        area = s.region;
      } else if (s.city) {
        area = s.city;
      }

      const ctaClick = s.ctaClicks[0];
      return {
        id: s.id,
        createdAt: s.createdAt,
        userAge: s.userAge,
        userGender: s.userGender ? GENDER_NAMES[s.userGender] || s.userGender : null,
        diagnosisType: s.diagnosisType?.name || DIAGNOSIS_TYPE_NAMES[s.diagnosisType?.slug || ""] || "不明",
        diagnosisTypeSlug: s.diagnosisType?.slug,
        channelName: s.channel?.name || "不明",
        channelId: s.channel?.id,
        area,
        ctaType: ctaClick ? CTA_TYPE_NAMES[ctaClick.ctaType] || ctaClick.ctaType : null,
        ctaClickCount: s._count.ctaClicks,
        ctaByType,
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
