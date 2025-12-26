import { prisma } from "./prisma";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "suspended";

export interface SubscriptionCheck {
  isActive: boolean;
  status: SubscriptionStatus;
  trialDaysLeft: number | null;
  message: string | null;
}

// サブスクリプション状態をチェック
export async function checkSubscription(clinicId: string): Promise<SubscriptionCheck> {
  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
  });

  if (!subscription) {
    return {
      isActive: false,
      status: "suspended",
      trialDaysLeft: null,
      message: "サブスクリプション情報が見つかりません",
    };
  }

  const now = new Date();

  // トライアル中
  if (subscription.status === "trial") {
    if (subscription.trialEnd && subscription.trialEnd > now) {
      const diff = subscription.trialEnd.getTime() - now.getTime();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return {
        isActive: true,
        status: "trial",
        trialDaysLeft: daysLeft,
        message: null,
      };
    }
    // トライアル期限切れ
    return {
      isActive: false,
      status: "suspended",
      trialDaysLeft: 0,
      message: "トライアル期間が終了しました。有料プランへの登録が必要です。",
    };
  }

  // 有料プラン
  if (subscription.status === "active") {
    return {
      isActive: true,
      status: "active",
      trialDaysLeft: null,
      message: null,
    };
  }

  // 解約済み（期間内は利用可能）
  if (subscription.status === "canceled") {
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
      return {
        isActive: true,
        status: "canceled",
        trialDaysLeft: null,
        message: null,
      };
    }
    return {
      isActive: false,
      status: "suspended",
      trialDaysLeft: null,
      message: "サブスクリプションが終了しました。再契約が必要です。",
    };
  }

  // 支払い遅延
  if (subscription.status === "past_due") {
    return {
      isActive: true, // 猶予期間中は利用可能
      status: "past_due",
      trialDaysLeft: null,
      message: "お支払いに問題があります。カード情報を更新してください。",
    };
  }

  // その他（suspended等）
  return {
    isActive: false,
    status: "suspended",
    trialDaysLeft: null,
    message: "サービスが利用できません。契約状況をご確認ください。",
  };
}

// 医院がアクティブかどうかをチェック（簡易版）
export async function isClinicActive(clinicId: string): Promise<boolean> {
  const check = await checkSubscription(clinicId);
  return check.isActive;
}
