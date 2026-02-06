// ダッシュボード共通の型定義と定数

export interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  diagnosisTypeName: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: string | null;
  scanCount: number;
  budget: number | null;
  createdAt: string;
}

export interface ChannelStats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaRate: number;
  ctaByType: Record<string, number>;
  genderByType: Record<string, number>;
  ageRanges: Record<string, number>;
  accessByDate: { date: string; count: number }[];
}

export interface HistoryItem {
  id: string;
  type: "diagnosis" | "link" | "qr_scan";
  createdAt: string;
  userAge: number | null;
  userGender: string | null;
  diagnosisType: string;
  diagnosisTypeSlug: string;
  resultCategory: string | null;
  channelName: string;
  channelId: string;
  area: string;
  ctaType: string | null;
  ctaClickCount: number;
  ctaByType: Record<string, number>;
}

export interface OverallStats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaRate: number;
  ctaByType: Record<string, number>;
  categoryStats: Record<string, { count: number; ctaCount: number; ctaRate: number }>;
  genderByType: Record<string, number>;
  ageRanges: Record<string, number>;
  trends: {
    accessCount: { value: number; isNew: boolean };
    completedCount: { value: number; isNew: boolean };
    ctaCount: { value: number; isNew: boolean };
  };
}

export interface SubscriptionInfo {
  status: string;
  planType: string;
  planName: string;
  qrCodeLimit: number | null;
  qrCodeCount: number;
  remainingQRCodes: number | null;
  canCreateQR: boolean;
  canEditQR: boolean;
  canEditDiagnosis: boolean;
  isDemo: boolean;
}

// CTAタイプの表示名
export const CTA_TYPE_NAMES: Record<string, string> = {
  booking: "予約",
  phone: "電話",
  line: "LINE",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  x: "X",
  google_maps: "マップ",
  clinic_page: "医院ページ",
  clinic_homepage: "ホームページ",
  direct_link: "直リンク",
};

// チャンネルごとの色
export const CHANNEL_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
];

// 年齢層のラベル
export const AGE_RANGE_LABELS = [
  "0-9",
  "10-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70-79",
  "80+",
];
