"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";

interface CTAConfig {
  bookingUrl?: string;
  lineUrl?: string;
  phone?: string;
  customCTAs?: { id: string; label: string; url: string }[];
}

interface ClinicInfo {
  ctaConfig: CTAConfig;
}

export function CTAAlert() {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClinicInfo = async () => {
      try {
        const response = await fetch("/api/clinic/page");
        if (response.ok) {
          const data = await response.json();
          setClinicInfo(data.clinic);
        }
      } catch (error) {
        console.error("Failed to fetch clinic info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinicInfo();
  }, []);

  if (isLoading || !clinicInfo) {
    return null;
  }

  const { ctaConfig } = clinicInfo;

  // 予約導線（電話、予約URL、LINE）のいずれかが設定されているかチェック
  const hasBookingUrl = !!ctaConfig?.bookingUrl;
  const hasLineUrl = !!ctaConfig?.lineUrl;
  const hasPhone = !!ctaConfig?.phone;
  const hasCustomCTAWithUrl =
    ctaConfig?.customCTAs?.some((cta) => cta.url && cta.label) ?? false;

  // いずれかの予約導線が設定されていれば表示しない
  if (hasBookingUrl || hasLineUrl || hasPhone || hasCustomCTAWithUrl) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4 mb-6 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-700">
            予約導線（CTA）が未設定です。診断後に患者様がアクションを起こせるよう、
            <span className="font-medium">予約URL、電話番号、LINE</span>
            のいずれかを設定してください。
          </p>
          <p className="text-xs mt-1 text-amber-700 opacity-80">
            予約導線を設定することで、診断から予約への転換率が向上します。
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Settings className="w-4 h-4" />
          CTAを設定
        </Link>
      </div>
    </div>
  );
}
