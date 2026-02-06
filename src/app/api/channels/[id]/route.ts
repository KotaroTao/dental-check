import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState } from "@/lib/subscription";
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

    // リンクタイプの場合、scanCountをDiagnosisSessionの件数から動的に計算
    let dynamicScanCount = channel.scanCount;
    if (channel.channelType === "link") {
      dynamicScanCount = await prisma.diagnosisSession.count({
        where: {
          channelId: id,
          sessionType: "link",
          isDeleted: false,
          completedAt: { not: null },
        },
      });
    }

    return NextResponse.json({
      channel: {
        ...channel,
        scanCount: dynamicScanCount,
      },
    });
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
    const {
      name,
      description,
      isActive,
      imageUrl,
      imageUrl2,
      expiresAt,
      redirectUrl,
      budget,
      distributionMethod,
      distributionQuantity,
    } = body;

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

    // デモアカウントは編集不可
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではQRコードの編集はできません。" },
        { status: 403 }
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
        ...(imageUrl2 !== undefined && { imageUrl2: imageUrl2 || null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(redirectUrl !== undefined && existingChannel.channelType === "link" && { redirectUrl: redirectUrl.trim() }),
        ...(budget !== undefined && { budget: budget !== null && budget !== "" ? parseInt(budget, 10) : null }),
        ...(distributionMethod !== undefined && { distributionMethod: distributionMethod || null }),
        ...(distributionQuantity !== undefined && { distributionQuantity: distributionQuantity !== null && distributionQuantity !== "" ? parseInt(distributionQuantity, 10) : null }),
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

    // デモアカウントは非表示化不可
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではQRコードの操作はできません。" },
        { status: 403 }
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
