import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState } from "@/lib/subscription";

// QRコードの順序を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // デモアカウントは順序変更不可
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではQRコードの操作はできません。" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { channelIds } = body;

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json(
        { error: "チャンネルIDの配列が必要です" },
        { status: 400 }
      );
    }

    // 所有権を確認しながら順序を更新
    const updates = channelIds.map((id: string, index: number) =>
      prisma.channel.updateMany({
        where: {
          id,
          clinicId: session.clinicId,
        },
        data: {
          sortOrder: index,
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder channels error:", error);
    return NextResponse.json(
      { error: "QRコードの順序更新に失敗しました" },
      { status: 500 }
    );
  }
}
