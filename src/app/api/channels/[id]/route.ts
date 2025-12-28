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
    const { name, description, isActive } = body;

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

    const channel = (await prisma.channel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
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

// QRコードを削除
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

    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({ message: "QRコードを削除しました" });
  } catch (error) {
    console.error("Delete channel error:", error);
    return NextResponse.json(
      { error: "QRコードの削除に失敗しました" },
      { status: 500 }
    );
  }
}
