import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pay.jp Webhookの処理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log("Pay.jp Webhook received:", type);

    switch (type) {
      case "subscription.renewed":
        // サブスクリプションが更新された
        await handleSubscriptionRenewed(data);
        break;

      case "subscription.canceled":
        // サブスクリプションがキャンセルされた
        await handleSubscriptionCanceled(data);
        break;

      case "subscription.paused":
        // 支払い失敗でサブスクリプションが一時停止
        await handleSubscriptionPaused(data);
        break;

      case "subscription.resumed":
        // サブスクリプションが再開された
        await handleSubscriptionResumed(data);
        break;

      case "charge.succeeded":
        // 課金が成功した
        console.log("Charge succeeded:", data.id);
        break;

      case "charge.failed":
        // 課金が失敗した
        await handleChargeFailed(data);
        break;

      default:
        console.log("Unhandled webhook event:", type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook処理に失敗しました" },
      { status: 500 }
    );
  }
}

// サブスクリプション更新処理
async function handleSubscriptionRenewed(data: {
  id: string;
  current_period_end: number;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: { payjpSubscriptionId: data.id },
  });

  if (!subscription) {
    console.log("Subscription not found:", data.id);
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodEnd: new Date(data.current_period_end * 1000),
    },
  });

  await prisma.clinic.update({
    where: { id: subscription.clinicId },
    data: { status: "active" },
  });

  console.log("Subscription renewed:", subscription.clinicId);
}

// サブスクリプションキャンセル処理
async function handleSubscriptionCanceled(data: { id: string }) {
  const subscription = await prisma.subscription.findFirst({
    where: { payjpSubscriptionId: data.id },
  });

  if (!subscription) {
    console.log("Subscription not found:", data.id);
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "canceled",
      payjpSubscriptionId: null,
    },
  });

  await prisma.clinic.update({
    where: { id: subscription.clinicId },
    data: { status: "canceled" },
  });

  console.log("Subscription canceled:", subscription.clinicId);
}

// サブスクリプション一時停止処理
async function handleSubscriptionPaused(data: { id: string }) {
  const subscription = await prisma.subscription.findFirst({
    where: { payjpSubscriptionId: data.id },
  });

  if (!subscription) {
    console.log("Subscription not found:", data.id);
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "past_due" },
  });

  await prisma.clinic.update({
    where: { id: subscription.clinicId },
    data: { status: "past_due" },
  });

  console.log("Subscription paused:", subscription.clinicId);
}

// サブスクリプション再開処理
async function handleSubscriptionResumed(data: {
  id: string;
  current_period_end: number;
}) {
  const subscription = await prisma.subscription.findFirst({
    where: { payjpSubscriptionId: data.id },
  });

  if (!subscription) {
    console.log("Subscription not found:", data.id);
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodEnd: new Date(data.current_period_end * 1000),
    },
  });

  await prisma.clinic.update({
    where: { id: subscription.clinicId },
    data: { status: "active" },
  });

  console.log("Subscription resumed:", subscription.clinicId);
}

// 課金失敗処理
async function handleChargeFailed(data: {
  subscription?: string;
  failure_message?: string;
}) {
  if (!data.subscription) return;

  const subscription = await prisma.subscription.findFirst({
    where: { payjpSubscriptionId: data.subscription },
  });

  if (!subscription) {
    console.log("Subscription not found for charge:", data.subscription);
    return;
  }

  // 支払い遅延状態に更新
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "past_due" },
  });

  await prisma.clinic.update({
    where: { id: subscription.clinicId },
    data: { status: "past_due" },
  });

  console.log("Charge failed for subscription:", subscription.clinicId);
}
