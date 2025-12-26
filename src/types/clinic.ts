export interface Clinic {
  id: string;
  slug: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  logoUrl: string | null;
  mainColor: string;
  ctaConfig: Record<string, unknown>;
  clinicPage: Record<string, unknown>;
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
