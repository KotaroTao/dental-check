import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payjp } from "@/lib/payjp";
import { getSubscriptionState } from "@/lib/subscription";
import { getPlan, getPublicPlans, type PlanType } from "@/lib/plans";

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

    // 契約状態を取得
    const state = await getSubscriptionState(session.clinicId);
    const planType = ((subscription as { planType?: string }).planType as PlanType) || "starter";
    const plan = getPlan(planType);

    return NextResponse.json({
      subscription: {
        status: state.status,
        planType: state.planType,
        planName: plan.name,
        trialEnd: subscription.trialEnd?.toISOString() || null,
        trialDaysLeft: state.trialDaysLeft,
        gracePeriodDaysLeft: state.gracePeriodDaysLeft,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: state.currentPeriodEnd?.toISOString() || null,
        canceledAt: subscription.canceledAt?.toISOString() || null,
        hasCard: !!card,
        card,
        planAmount: plan.price,
        qrCodeLimit: state.qrCodeLimit,
        qrCodeCount: state.qrCodeCount,
        remainingQRCodes: state.remainingQRCodes,
        canCreateQR: state.canCreateQR,
        canTrack: state.canTrack,
        message: state.message,
        alertType: state.alertType,
      },
      availablePlans: getPublicPlans(),
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "サブスクリプション情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
