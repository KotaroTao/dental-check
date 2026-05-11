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
          where: { isActive: true },
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
      distributionMethod,
      distributionQuantity,
      distributionPeriod,
      budget,
      imageUrl,
      imageUrl2,
    } = body;

    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "チラシ名を入力してください" },
          { status: 400 }
        );
      }
    }

    const flyer = await prisma.flyer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(distributionMethod !== undefined && {
          distributionMethod: distributionMethod?.trim() || null,
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
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
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

// チラシを削除（紐付くQRは flyerId=null になり、単独QR扱いとして残る）
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

    // onDelete: SetNull により Channel.flyer_id は自動的に null に戻る
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
