import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payjp } from "@/lib/payjp";

// サブスクリプションを解約
export async function POST() {
  try {
    if (!payjp) {
      return NextResponse.json(
        { error: "決済機能が利用できません" },
        { status: 503 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: session.clinicId },
    });

    if (!subscription?.payjpSubscriptionId) {
      return NextResponse.json(
        { error: "有効なサブスクリプションがありません" },
        { status: 400 }
      );
    }

    // Pay.jpでサブスクリプションをキャンセル（期間終了時に停止）
    await payjp.subscriptions.cancel(subscription.payjpSubscriptionId);

    // データベースを更新
    const now = new Date();
    await prisma.subscription.update({
      where: { clinicId: session.clinicId },
      data: {
        status: "canceled",
        canceledAt: now,
      },
    });

    // 医院のステータスも更新
    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { status: "canceled" },
    });

    return NextResponse.json({
      message: "サブスクリプションを解約しました。現在の期間終了まで利用可能です。",
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "解約に失敗しました" },
      { status: 500 }
    );
  }
}
