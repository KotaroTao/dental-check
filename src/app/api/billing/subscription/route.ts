import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payjp, PLAN_AMOUNT } from "@/lib/payjp";

// サブスクリプション情報を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: session.clinicId },
    });

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
      });
    }

    // カード情報を取得
    let card = null;
    if (payjp && subscription.payjpCustomerId) {
      try {
        const customer = await payjp.customers.retrieve(subscription.payjpCustomerId);
        const cardData = customer.cards?.data?.[0];
        if (cardData) {
          card = {
            last4: cardData.last4,
            brand: cardData.brand,
            expMonth: cardData.exp_month,
            expYear: cardData.exp_year,
          };
        }
      } catch {
        // カード取得エラーは無視
      }
    }

    // トライアル残り日数を計算
    let trialDaysLeft = null;
    if (subscription.status === "trial" && subscription.trialEnd) {
      const now = new Date();
      const diff = subscription.trialEnd.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      subscription: {
        status: subscription.status,
        trialEnd: subscription.trialEnd?.toISOString() || null,
        trialDaysLeft,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
        canceledAt: subscription.canceledAt?.toISOString() || null,
        hasCard: !!card,
        card,
        planAmount: PLAN_AMOUNT,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "サブスクリプション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
