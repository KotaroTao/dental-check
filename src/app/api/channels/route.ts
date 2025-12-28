import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Channel } from "@/types/clinic";

// QRコード一覧を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const channels = (await prisma.channel.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "desc" },
    })) as Channel[];

    return NextResponse.json({ channels });
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

    const body = await request.json();
    const { name, description, diagnosisTypeSlug, imageUrl } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "QRコード名を入力してください" },
        { status: 400 }
      );
    }

    if (!diagnosisTypeSlug || diagnosisTypeSlug.trim() === "") {
      return NextResponse.json(
        { error: "診断タイプを選択してください" },
        { status: 400 }
      );
    }

    // ユニークなコードを生成
    const code = await generateUniqueChannelCode();

    const channel = (await prisma.channel.create({
      data: {
        clinicId: session.clinicId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl || null,
        diagnosisTypeSlug: diagnosisTypeSlug.trim(),
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
