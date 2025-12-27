export interface CTAConfig {
  bookingUrl?: string;
  lineUrl?: string;
  instagramUrl?: string;
  phone?: string;
  directorMessage?: string;
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

// 診療時間
export interface ClinicHours {
  weekday?: string;
  saturday?: string;
  sunday?: string;
  holiday?: string;
  note?: string;
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
  access?: ClinicAccess;
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
  diagnosisTypeSlug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
