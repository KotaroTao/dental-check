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
      sessionType: string | null;
      region: string | null;
      city: string | null;
      town: string | null;
      channel: { id: string; name: string } | null;
      diagnosisType: { slug: string; name: string } | null;
      ctaClicks: { ctaType: string }[];
      _count: { ctaClicks: number };
    };

    // 診断履歴を整形
    const diagnosisHistory = (sessions as SessionWithRelations[]).map((s) => {
      // CTA内訳を集計
      const ctaByType: Record<string, number> = {};
      for (const click of s.ctaClicks) {
        ctaByType[click.ctaType] = (ctaByType[click.ctaType] || 0) + 1;
      }

      // エリア情報を整形（市区町村 + 町丁目）
      let area = "-";
      if (s.city && s.town) {
        area = `${s.city} ${s.town}`;
      } else if (s.city) {
        area = s.city;
      } else if (s.region) {
        area = s.region;
      }

      const ctaClick = s.ctaClicks[0];

      // セッションタイプに応じた表示名を決定
      let diagnosisTypeName: string;
      if (s.sessionType === "link") {
        diagnosisTypeName = "リンクQR";
      } else {
        diagnosisTypeName = s.diagnosisType?.name || DIAGNOSIS_TYPE_NAMES[s.diagnosisType?.slug || ""] || "不明";
      }

      return {
        id: s.id,
        type: s.sessionType === "link" ? "link" as const : "diagnosis" as const,
        createdAt: s.createdAt,
        userAge: s.userAge,
        userGender: s.userGender ? GENDER_NAMES[s.userGender] || s.userGender : null,
        diagnosisType: diagnosisTypeName,
        diagnosisTypeSlug: s.diagnosisType?.slug || null,
        channelName: s.channel?.name || "不明",
        channelId: s.channel?.id,
        area,
        ctaType: ctaClick ? CTA_TYPE_NAMES[ctaClick.ctaType] || ctaClick.ctaType : null,
        ctaClickCount: s._count.ctaClicks,
        ctaByType,
      };
    });

    // QRスキャン（リンクタイプ）の履歴を取得
    type AccessLogFilterType = {
      clinicId: string;
      eventType: string;
      createdAt: { gte: Date; lte: Date };
      channelId?: string | { in: string[] };
    };

    const accessLogFilter: AccessLogFilterType = {
      clinicId: session.clinicId,
      eventType: "qr_scan",
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (channelId) {
      accessLogFilter.channelId = channelId;
    } else if (activeChannelIds.length > 0) {
      accessLogFilter.channelId = { in: activeChannelIds };
    }

    // diagnosisTypeが指定されている場合はQRスキャンを除外
    const includeQRScans = !diagnosisType;

    let qrScanHistory: Array<{
      id: string;
      type: "qr_scan";
      createdAt: Date;
      userAge: null;
      userGender: null;
      diagnosisType: string;
      diagnosisTypeSlug: null;
      channelName: string;
      channelId: string | null;
      area: string;
      ctaType: null;
      ctaClickCount: number;
      ctaByType: Record<string, number>;
    }> = [];

    if (includeQRScans) {
      type AccessLogWithChannel = {
        id: string;
        createdAt: Date;
        region: string | null;
        city: string | null;
        channel: { id: string; name: string } | null;
      };

      const qrScans = await prisma.accessLog.findMany({
        where: accessLogFilter,
        include: {
          channel: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }) as AccessLogWithChannel[];

      qrScanHistory = qrScans.map((log: AccessLogWithChannel) => {
        // エリア情報を整形（市区町村優先）
        let area = "-";
        if (log.city) {
          area = log.city;
        } else if (log.region) {
          area = log.region;
        }

        return {
          id: log.id,
          type: "qr_scan" as const,
          createdAt: log.createdAt,
          userAge: null,
          userGender: null,
          diagnosisType: "QR読み込み",
          diagnosisTypeSlug: null,
          channelName: log.channel?.name || "不明",
          channelId: log.channel?.id || null,
          area,
          ctaType: null,
          ctaClickCount: 0,
          ctaByType: {},
        };
      });
    }

    // 両方の履歴を統合し、日時でソート
    const history = [...diagnosisHistory, ...qrScanHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, limit);

    // 合計件数
    const qrScanTotalCount = includeQRScans
      ? await prisma.accessLog.count({ where: accessLogFilter })
      : 0;
    const combinedTotalCount = totalCount + qrScanTotalCount;

    return NextResponse.json({
      history,
      totalCount: combinedTotalCount,
      hasMore: offset + limit < combinedTotalCount,
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
