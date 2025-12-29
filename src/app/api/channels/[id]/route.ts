import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Channel } from "@/types/clinic";

// QRコード詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const channel = (await prisma.channel.findFirst({
      where: {
        id,
        clinicId: session.clinicId,
      },
    })) as Channel | null;

    if (!channel) {
      return NextResponse.json(
        { error: "QRコードが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error("Get channel error:", error);
    return NextResponse.json(
      { error: "QRコードの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// QRコードを更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, imageUrl, expiresAt, redirectUrl } = body;

    const existingChannel = await prisma.channel.findFirst({
      where: {
        id,
        clinicId: session.clinicId,
      },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: "QRコードが見つかりません" },
        { status: 404 }
      );
    }

    // リンクタイプでリダイレクトURLが指定された場合は検証
    if (existingChannel.channelType === "link" && redirectUrl !== undefined) {
      if (!redirectUrl || redirectUrl.trim() === "") {
        return NextResponse.json(
          { error: "リダイレクト先URLを入力してください" },
          { status: 400 }
        );
      }
      try {
        new URL(redirectUrl);
      } catch {
        return NextResponse.json(
          { error: "有効なURLを入力してください" },
          { status: 400 }
        );
      }
    }

    const channel = (await prisma.channel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(redirectUrl !== undefined && existingChannel.channelType === "link" && { redirectUrl: redirectUrl.trim() }),
      },
    })) as Channel;

    return NextResponse.json({ channel });
  } catch (error) {
    console.error("Update channel error:", error);
    return NextResponse.json(
      { error: "QRコードの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// QRコードを非表示にする（ソフト削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const existingChannel = await prisma.channel.findFirst({
      where: {
        id,
        clinicId: session.clinicId,
      },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: "QRコードが見つかりません" },
        { status: 404 }
      );
    }

    // 削除ではなく非表示にする
    await prisma.channel.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "QRコードを非表示にしました" });
  } catch (error) {
    console.error("Hide channel error:", error);
    return NextResponse.json(
      { error: "QRコードの非表示に失敗しました" },
      { status: 500 }
    );
  }
}
