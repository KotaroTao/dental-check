import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState } from "@/lib/subscription";

// QRコードを完全に削除する（物理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // デモアカウントは完全削除不可
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではQRコードの操作はできません。" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // QRコードを取得
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

    // 非表示（isActive=false）のQRコードのみ完全削除可能
    if (existingChannel.isActive) {
      return NextResponse.json(
        { error: "有効なQRコードは完全削除できません。先に非表示にしてください。" },
        { status: 400 }
      );
    }

    // トランザクションで関連データを含めて完全削除
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // 1. CTAクリック履歴を削除（DiagnosisSession経由）
      const sessionIds = await tx.diagnosisSession.findMany({
        where: { channelId: id },
        select: { id: true },
      });

      if (sessionIds.length > 0) {
        await tx.cTAClick.deleteMany({
          where: {
            sessionId: {
              in: sessionIds.map((s: { id: string }) => s.id),
            },
          },
        });
      }

      // 2. 診断セッションを削除
      await tx.diagnosisSession.deleteMany({
        where: { channelId: id },
      });

      // 3. アクセスログを削除
      await tx.accessLog.deleteMany({
        where: { channelId: id },
      });

      // 4. QRコード自体を削除
      await tx.channel.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "QRコードと関連するすべてのデータを完全に削除しました"
    });
  } catch (error) {
    console.error("Permanent delete channel error:", error);
    return NextResponse.json(
      { error: "QRコードの完全削除に失敗しました" },
      { status: 500 }
    );
  }
}
