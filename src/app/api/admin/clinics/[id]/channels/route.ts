import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// 指定医院のQRコード一覧を取得（管理者用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: clinicId } = await params;

    // 医院の存在確認
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, slug: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    const channels = await prisma.channel.findMany({
      where: { clinicId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // 診断タイプ名を取得してマッピング
    const diagnosisSlugs = channels
      .map((c: { diagnosisTypeSlug: string | null }) => c.diagnosisTypeSlug)
      .filter((slug: string | null): slug is string => slug !== null);

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

    // チャンネルに診断名を追加
    const channelsWithDiagnosisName = channels.map((c: { diagnosisTypeSlug: string | null }) => ({
      ...c,
      diagnosisTypeName: c.diagnosisTypeSlug
        ? diagnosisNameMap[c.diagnosisTypeSlug] || c.diagnosisTypeSlug
        : null,
    }));

    return NextResponse.json({
      clinicName: clinic.name,
      clinicSlug: clinic.slug,
      channels: channelsWithDiagnosisName,
      activeCount: channels.filter((c: { isActive: boolean }) => c.isActive).length,
      hiddenCount: channels.filter((c: { isActive: boolean }) => !c.isActive).length,
    });
  } catch (error) {
    console.error("Admin clinic channels error:", error);
    return NextResponse.json(
      { error: "QRコードの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 新しいQRコードを作成（管理者用）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: clinicId } = await params;

    // 医院の存在確認
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
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

    const channel = await prisma.channel.create({
      data: {
        clinicId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        channelType: type,
        diagnosisTypeSlug: type === "diagnosis" ? diagnosisTypeSlug.trim() : null,
        redirectUrl: type === "link" ? redirectUrl.trim() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        code,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("Admin create channel error:", error);
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
