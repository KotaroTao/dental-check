import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState } from "@/lib/subscription";

// チラシ詳細を取得（紐付くQR一覧も返す）
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
    const flyer = await prisma.flyer.findFirst({
      where: { id, clinicId: session.clinicId },
      include: {
        channels: {
          // 非表示（isActive=false）の QR も含めて返す。
          // 非表示にしたあと再度有効化したい時、編集ページへ戻る導線が必要なため。
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            code: true,
            channelType: true,
            isActive: true,
          },
        },
      },
    });

    if (!flyer) {
      return NextResponse.json(
        { error: "チラシが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ flyer });
  } catch (error) {
    console.error("Get flyer error:", error);
    return NextResponse.json(
      { error: "チラシの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// チラシを更新
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
    const existing = await prisma.flyer.findFirst({
      where: { id, clinicId: session.clinicId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "チラシが見つかりません" },
        { status: 404 }
      );
    }

    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではチラシの編集はできません。" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      distributionMethod,
      distributionQuantity,
      distributionPeriod,
      budget,
      imageUrl,
      imageUrl2,
    } = body;

    // 必須項目を明示的にクリアする更新は拒否
    // ─ name: 空文字・null は拒否
    // ─ distributionMethod: 空文字・null は拒否
    // ─ imageUrl: 空文字・null は拒否（表面は必須）
    // ─ undefined（送信されない）はそのまま既存値を保持
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "チラシ名を入力してください" },
          { status: 400 }
        );
      }
    }
    if (distributionMethod !== undefined) {
      if (
        distributionMethod === null ||
        typeof distributionMethod !== "string" ||
        distributionMethod.trim() === ""
      ) {
        return NextResponse.json(
          { error: "配布方法を選択してください" },
          { status: 400 }
        );
      }
    }
    if (imageUrl !== undefined) {
      if (imageUrl === null || typeof imageUrl !== "string" || imageUrl.trim() === "") {
        return NextResponse.json(
          { error: "チラシ表面の画像をアップロードしてください" },
          { status: 400 }
        );
      }
    }

    const flyer = await prisma.flyer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(distributionMethod !== undefined && {
          distributionMethod: distributionMethod.trim(),
        }),
        ...(distributionQuantity !== undefined && {
          distributionQuantity:
            distributionQuantity !== null && distributionQuantity !== ""
              ? parseInt(String(distributionQuantity), 10)
              : null,
        }),
        ...(distributionPeriod !== undefined && {
          distributionPeriod: distributionPeriod?.trim() || null,
        }),
        ...(budget !== undefined && {
          budget:
            budget !== null && budget !== ""
              ? parseInt(String(budget), 10)
              : null,
        }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl }),
        // 裏面画像は任意（null クリアも許可）
        ...(imageUrl2 !== undefined && { imageUrl2: imageUrl2 || null }),
      },
    });

    return NextResponse.json({ flyer });
  } catch (error) {
    console.error("Update flyer error:", error);
    return NextResponse.json(
      { error: "チラシの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// チラシを削除
// 注意: 表示中のQRが紐付いているチラシは削除不可。
// 全てのQRが非表示（isActive=false）または既に外されていれば削除できる。
// 削除時、紐付くQRは schema の onDelete:SetNull により flyerId=null（単独QR）に戻る。
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
    const existing = await prisma.flyer.findFirst({
      where: { id, clinicId: session.clinicId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "チラシが見つかりません" },
        { status: 404 }
      );
    }

    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではチラシの削除はできません。" },
        { status: 403 }
      );
    }

    // 表示中（isActive=true）のQRが残っている場合のみ削除拒否。
    // 全て非表示にしてあれば削除を許可する（hiddenなQRは flyerId=null の単独QRに戻る）。
    const activeChannelCount = await prisma.channel.count({
      where: { flyerId: id, isActive: true },
    });
    if (activeChannelCount > 0) {
      return NextResponse.json(
        {
          error: `このチラシには${activeChannelCount}件の表示中のQRが紐付いています。先にQRを別のチラシへ移動するか、非表示にしてからチラシを削除してください。`,
        },
        { status: 400 }
      );
    }

    await prisma.flyer.delete({ where: { id } });

    return NextResponse.json({ message: "チラシを削除しました" });
  } catch (error) {
    console.error("Delete flyer error:", error);
    return NextResponse.json(
      { error: "チラシの削除に失敗しました" },
      { status: 500 }
    );
  }
}
