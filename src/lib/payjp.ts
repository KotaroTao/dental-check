import Payjp from "payjp";

const payjpSecretKey = process.env.PAYJP_SECRET_KEY;

if (!payjpSecretKey) {
  console.warn("PAYJP_SECRET_KEY is not set. Payment features will not work.");
}

export const payjp = payjpSecretKey ? Payjp(payjpSecretKey) : null;

// 月額プラン（3,300円税込）
export const PLAN_AMOUNT = 3300;
export const PLAN_CURRENCY = "jpy";

// トライアル日数
export const TRIAL_DAYS = 14;

// Pay.jpプランID（Pay.jp管理画面で作成したプランのID）
export const PLAN_ID = process.env.PAYJP_PLAN_ID || "dental_check_monthly";
