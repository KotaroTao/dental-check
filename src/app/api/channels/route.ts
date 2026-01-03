import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateChannel } from "@/lib/subscription";
import type { Channel } from "@/types/clinic";

// QRコード一覧を取得（アクティブ・非表示両方）
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
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

    // 各チャンネルのアクセスログ数を取得（診断QRの読み込み回数）
    const channelIds = channels.map((c) => c.id);
    const accessCounts = channelIds.length > 0
      ? await prisma.accessLog.groupBy({
          by: ["channelId"],
          where: {
            clinicId: session.clinicId,
            channelId: { in: channelIds },
            eventType: { not: "clinic_page_view" },
          },
          _count: { id: true },
        })
      : [];

    // アクセスカウントをマップに変換
    const accessCountMap: Record<string, number> = {};
    for (const ac of accessCounts) {
      if (ac.channelId) {
        accessCountMap[ac.channelId] = ac._count.id;
      }
    }

    // チャンネルに診断名とスキャン数を追加
    // 診断QRの場合はAccessLogから、リンクQRの場合はscanCountフィールドから取得
    const channelsWithDiagnosisName = channels.map((c) => ({
      ...c,
      diagnosisTypeName: c.diagnosisTypeSlug
        ? diagnosisNameMap[c.diagnosisTypeSlug] || c.diagnosisTypeSlug
        : null,
      // 診断タイプはAccessLogカウント、リンクタイプはscanCountを使用
      scanCount: c.channelType === "link" ? c.scanCount : (accessCountMap[c.id] || 0),
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
    const { name, description, channelType, diagnosisTypeSlug, redirectUrl, imageUrl, expiresAt } = body;

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
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        channelType: type,
        diagnosisTypeSlug: type === "diagnosis" ? diagnosisTypeSlug.trim() : null,
        redirectUrl: type === "link" ? redirectUrl.trim() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
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
