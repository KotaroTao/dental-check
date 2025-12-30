// プラン定義

export type PlanType = "starter" | "standard" | "custom" | "managed" | "free";

export interface Plan {
  type: PlanType;
  name: string;
  price: number; // 税別月額（円）
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
      "すべての診断コンテンツを利用可能",
      "診断結果の閲覧",
      "詳細な分析機能",
      "CSVエクスポート",
    ],
  },
  standard: {
    type: "standard",
    name: "スタンダードプラン",
    price: 8800,
    qrCodeLimit: 10,
    description: "本格的に活用したい医院様向け",
    features: [
      "QRコード10枚まで作成可能",
      "すべての診断コンテンツを利用可能",
      "診断結果の閲覧",
      "詳細な分析機能",
      "CSVエクスポート",
    ],
  },
  custom: {
    type: "custom",
    name: "カスタムプラン",
    price: 12800,
    qrCodeLimit: null,
    description: "オリジナル診断を作成したい医院様向け",
    features: [
      "QRコード無制限",
      "すべての診断コンテンツを利用可能",
      "診断結果の閲覧",
      "詳細な分析機能",
      "CSVエクスポート",
      "オリジナル診断作成（無制限）",
    ],
  },
  managed: {
    type: "managed",
    name: "マネージドプラン",
    price: 39800,
    qrCodeLimit: null,
    description: "マーケティング業務を丸ごとお任せ",
    features: [
      "カスタムプランの内容全て",
      "マーケティング業務を全て代行",
      "チラシ作成・ポスティング地域の提案",
      "オリジナル診断作成・業者やりとり・戦略立案",
      "貴院のマーケティング担当として伴走",
    ],
  },
  free: {
    type: "free",
    name: "特別プラン（無料・無制限）",
    price: 0,
    qrCodeLimit: null,
    description: "管理者専用設定",
    features: [
      "QRコード無制限",
      "全機能利用可能",
      "オリジナル診断作成（無制限）",
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
  return `¥${price.toLocaleString()}/月（税別）`;
}

// オリジナル診断作成可能なプラン
const CUSTOM_DIAGNOSIS_PLANS: PlanType[] = ["free", "custom", "managed"];

// オリジナル診断作成可能かチェック
export function canCreateCustomDiagnosis(planType: PlanType): boolean {
  return CUSTOM_DIAGNOSIS_PLANS.includes(planType);
}
