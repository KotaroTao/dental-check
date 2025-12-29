// プラン定義

export type PlanType = "starter" | "standard" | "managed" | "free";

export interface Plan {
  type: PlanType;
  name: string;
  price: number; // 税込月額（円）
  qrCodeLimit: number | null; // null = 無制限
  features: string[];
  description: string;
  isAdminOnly?: boolean; // 管理者のみが設定可能
}

export const PLANS: Record<PlanType, Plan> = {
  starter: {
    type: "starter",
    name: "スタータープラン",
    price: 4980,
    qrCodeLimit: 2,
    description: "お手軽に始めたい医院様向け",
    features: [
      "QRコード2枚まで作成可能",
      "診断結果の閲覧",
      "基本的な分析機能",
    ],
  },
  standard: {
    type: "standard",
    name: "スタンダードプラン",
    price: 8800,
    qrCodeLimit: null,
    description: "本格的に活用したい医院様向け",
    features: [
      "QRコード無制限",
      "診断結果の閲覧",
      "詳細な分析機能",
      "CSVエクスポート",
    ],
  },
  managed: {
    type: "managed",
    name: "マネージドプラン",
    price: 29800,
    qrCodeLimit: null,
    description: "分析サポート付きのフルサポートプラン",
    features: [
      "QRコード無制限",
      "診断結果の閲覧",
      "詳細な分析機能",
      "CSVエクスポート",
      "専任担当者による分析サポート",
      "月次レポート提供",
    ],
  },
  free: {
    type: "free",
    name: "無料プラン",
    price: 0,
    qrCodeLimit: null,
    description: "管理者専用設定",
    features: [
      "QRコード無制限",
      "全機能利用可能",
    ],
    isAdminOnly: true,
  },
};

// トライアル期間の設定
export const TRIAL_CONFIG = {
  durationDays: 14,
  planEquivalent: "starter" as PlanType, // トライアル中はスタータープラン相当
};

// 猶予期間の設定
export const GRACE_PERIOD_DAYS = 3;

// データ保持期間（契約終了後）
export const DATA_RETENTION_DAYS = 90;

// プラン取得ヘルパー
export function getPlan(planType: PlanType): Plan {
  return PLANS[planType] || PLANS.starter;
}

// QRコード作成可能かチェック
export function canCreateQRCode(planType: PlanType, currentQRCount: number): boolean {
  const plan = getPlan(planType);
  if (plan.qrCodeLimit === null) {
    return true; // 無制限
  }
  return currentQRCount < plan.qrCodeLimit;
}

// 残り作成可能なQRコード数
export function getRemainingQRCodes(planType: PlanType, currentQRCount: number): number | null {
  const plan = getPlan(planType);
  if (plan.qrCodeLimit === null) {
    return null; // 無制限
  }
  return Math.max(0, plan.qrCodeLimit - currentQRCount);
}

// プラン一覧（管理者向けを除く）
export function getPublicPlans(): Plan[] {
  return Object.values(PLANS).filter((plan) => !plan.isAdminOnly);
}

// プラン一覧（全て）
export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

// プラン価格のフォーマット
export function formatPlanPrice(price: number): string {
  if (price === 0) {
    return "無料";
  }
  return `¥${price.toLocaleString()}/月`;
}
