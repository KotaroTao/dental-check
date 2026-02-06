// カスタムCTAボタン
export interface CustomCTA {
  id: string;
  label: string;
  url: string;
  color?: string;
}

export interface CTAConfig {
  bookingUrl?: string;
  lineUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  threadsUrl?: string;
  xUrl?: string;           // X (Twitter)
  googleMapsUrl?: string;  // Googleマップ
  clinicHomepageUrl?: string;  // 医院ホームページURL
  phone?: string;
  directorMessage?: string;
  customCTAs?: CustomCTA[];  // カスタムCTAボタン
  ctaOrder?: string[];       // ボタンの表示順序
}

// 医院紹介ページの写真
export interface ClinicPhoto {
  url: string;
  caption?: string;
}

// 院長情報
export interface DirectorInfo {
  name?: string;
  photoUrl?: string;
  profile?: string;
}

// 診療時間（従来形式）
export interface ClinicHours {
  weekday?: string;
  saturday?: string;
  sunday?: string;
  holiday?: string;
  note?: string;
}

// 曜日別診療時間（詳細形式）
export interface DaySchedule {
  morning?: string;  // 午前（例: "9:00-12:00"）
  afternoon?: string; // 午後（例: "14:00-18:00"）
  closed?: boolean;   // 休診
  note?: string;      // 備考（例: "隔週"）
}

export interface WeeklySchedule {
  mon?: DaySchedule;
  tue?: DaySchedule;
  wed?: DaySchedule;
  thu?: DaySchedule;
  fri?: DaySchedule;
  sat?: DaySchedule;
  sun?: DaySchedule;
  holiday?: DaySchedule;
  note?: string;       // 全体備考
}

// 診療内容
export interface Treatment {
  name: string;        // 治療名（例: "一般歯科"）
  icon?: string;       // アイコン名
}

// 設備・特徴
export interface Facility {
  name: string;        // 設備名（例: "駐車場完備"）
  icon?: string;       // アイコン名
}

// お知らせ
export interface Announcement {
  id: string;          // 識別子
  title: string;       // タイトル
  content?: string;    // 内容
  date: string;        // 日付（YYYY-MM-DD）
  important?: boolean; // 重要フラグ
}

// アクセス情報
export interface ClinicAccess {
  address?: string;
  mapEmbed?: string;
  note?: string;
}

// 医院紹介ページ
export interface ClinicPage {
  photos?: ClinicPhoto[];
  director?: DirectorInfo;
  hours?: ClinicHours;
  weeklySchedule?: WeeklySchedule;  // 曜日別診療時間
  access?: ClinicAccess;
  treatments?: Treatment[];          // 診療内容
  facilities?: Facility[];           // 設備・特徴
  announcements?: Announcement[];    // お知らせ
}

export interface Clinic {
  id: string;
  slug: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  logoUrl: string | null;
  mainColor: string;
  ctaConfig: CTAConfig;
  clinicPage: ClinicPage;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  subscription?: Subscription | null;
}

export interface Subscription {
  id: string;
  clinicId: string;
  payjpCustomerId: string | null;
  payjpSubscriptionId: string | null;
  status: string;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  clinicId: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  scanCount: number;
  budget: number | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  createdAt: Date;
  updatedAt: Date;
}
