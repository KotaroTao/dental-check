import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payjp, PLAN_ID } from "@/lib/payjp";

// サブスクリプションを開始
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

    if (!subscription) {
      return NextResponse.json(
        { error: "サブスクリプション情報が見つかりません" },
        { status: 404 }
      );
    }

    if (subscription.payjpSubscriptionId) {
      return NextResponse.json(
        { error: "既にサブスクリプションが有効です" },
        { status: 400 }
      );
    }

    if (!subscription.payjpCustomerId) {
      return NextResponse.json(
        { error: "カードを登録してください" },
        { status: 400 }
      );
    }

    // サブスクリプションを作成
    const payjpSubscription = await payjp.subscriptions.create({
      customer: subscription.payjpCustomerId,
      plan: PLAN_ID,
    });

    // データベースを更新
    const now = new Date();
    const periodEnd = new Date(payjpSubscription.current_period_end * 1000);

    await prisma.subscription.update({
      where: { clinicId: session.clinicId },
      data: {
        payjpSubscriptionId: payjpSubscription.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: null,
      },
    });

    // 医院のステータスも更新
    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { status: "active" },
    });

    return NextResponse.json({
      subscription: {
        status: "active",
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "サブスクリプション開始に失敗しました" },
      { status: 500 }
    );
  }
}
