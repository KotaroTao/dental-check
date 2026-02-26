import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChannel } from "@/lib/subscription";
import type { Channel } from "@/types/clinic";

// QRコード一覧を取得（アクティブ・非表示両方）
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 期間の計算（"all"の場合はフィルタリングしない）
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (period !== "all") {
      dateTo = new Date();

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
    }

    const channels = (await prisma.channel.findMany({
      where: { clinicId: session.clinicId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    })) as Channel[];

    // 診断タイプ名を取得してマッピング
    const diagnosisSlugs = channels
      .map((c) => c.diagnosisTypeSlug)
      .filter((slug): slug is string => slug !== null);

    const diagnosisTypes = diagnosisSlugs.length > 0
      ? await prisma.diagnosisType.findMany({
          where: { slug: { in: diagnosisSlugs } },
          select: { slug: true, name: true },
        })
      : [];

    const diagnosisNameMap: Record<string, string> = {};
    for (const dt of diagnosisTypes) {
      diagnosisNameMap[dt.slug] = dt.name;
    }

    // 各チャンネルのQR読込数をDiagnosisSessionから取得（削除済みを除外）
    const channelIds = channels.map((c) => c.id);
    const sessionCounts = channelIds.length > 0
      ? await prisma.diagnosisSession.groupBy({
          by: ["channelId"],
          where: {
            channelId: { in: channelIds },
            isDeleted: false,
            completedAt: { not: null },
            isDemo: false,
            ...(dateFrom && dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}),
          },
          _count: { id: true },
        })
      : [];

    // カウントをマップに変換
    const sessionCountMap: Record<string, number> = {};
    for (const sc of sessionCounts) {
      if (sc.channelId) {
        sessionCountMap[sc.channelId] = sc._count.id;
      }
    }

    // チャンネルに診断名とスキャン数を追加
    const channelsWithDiagnosisName = channels.map((c) => ({
      ...c,
      diagnosisTypeName: c.diagnosisTypeSlug
        ? diagnosisNameMap[c.diagnosisTypeSlug] || c.diagnosisTypeSlug
        : null,
      scanCount: sessionCountMap[c.id] || 0,
    }));

    const activeCount = channels.filter((c) => c.isActive).length;
    const hiddenCount = channels.filter((c) => !c.isActive).length;

    // QRコード作成可能状態を取得
    const canCreate = await canCreateChannel(session.clinicId);

    return NextResponse.json({
      channels: channelsWithDiagnosisName,
      activeCount,
      hiddenCount,
      canCreateQR: canCreate.canCreate,
      remainingQRCodes: canCreate.remaining,
      limitMessage: canCreate.message,
    });
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json(
      { error: "QRコードの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 新しいQRコードを作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // QRコード作成可能かチェック
    const canCreate = await canCreateChannel(session.clinicId);
    if (!canCreate.canCreate) {
      return NextResponse.json(
        { error: canCreate.message || "QRコードを作成できません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, displayName, description, channelType, diagnosisTypeSlug, redirectUrl, imageUrl, expiresAt, budget, distributionMethod, distributionQuantity, distributionPeriod } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "QRコード名を入力してください" },
        { status: 400 }
      );
    }

    const type = channelType || "diagnosis";

    // 診断タイプの場合は診断スラッグが必須
    if (type === "diagnosis" && (!diagnosisTypeSlug || diagnosisTypeSlug.trim() === "")) {
      return NextResponse.json(
        { error: "診断タイプを選択してください" },
        { status: 400 }
      );
    }

    // リンクタイプの場合はリダイレクトURLが必須
    if (type === "link" && (!redirectUrl || redirectUrl.trim() === "")) {
      return NextResponse.json(
        { error: "リダイレクト先URLを入力してください" },
        { status: 400 }
      );
    }

    // URL形式チェック
    if (type === "link") {
      try {
        new URL(redirectUrl);
      } catch {
        return NextResponse.json(
          { error: "有効なURLを入力してください" },
          { status: 400 }
        );
      }
    }

    // ユニークなコードを生成
    const code = await generateUniqueChannelCode();

    const channel = (await prisma.channel.create({
      data: {
        clinicId: session.clinicId,
        name: name.trim(),
        displayName: displayName?.trim() || null,
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        channelType: type,
        diagnosisTypeSlug: type === "diagnosis" ? diagnosisTypeSlug.trim() : null,
        redirectUrl: type === "link" ? redirectUrl.trim() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        budget: budget ? parseInt(budget, 10) : null,
        distributionMethod: distributionMethod || null,
        distributionQuantity: distributionQuantity ? parseInt(distributionQuantity, 10) : null,
        distributionPeriod: distributionPeriod?.trim() || null,
        code,
      },
    })) as Channel;

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("Create channel error:", error);
    return NextResponse.json(
      { error: "QRコードの作成に失敗しました" },
      { status: 500 }
    );
  }
}

async function generateUniqueChannelCode(): Promise<string> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 重複チェック
    const existing = await prisma.channel.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }
  }

  // フォールバック: タイムスタンプベースのコード
  return Date.now().toString(36).slice(-8);
}
