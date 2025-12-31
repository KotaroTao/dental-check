"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2 } from "lucide-react";
import Link from "next/link";

interface ClinicPage {
  photos?: { url: string }[];
  director?: { name?: string };
  hours?: { weekday?: string };
  weeklySchedule?: Record<string, unknown>;
  access?: { address?: string };
  treatments?: { name: string }[];
}

interface ClinicInfo {
  clinicPage: ClinicPage;
}

export function ClinicInfoAlert() {
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

  const { clinicPage } = clinicInfo;

  // 医院情報が入力されているかチェック
  const hasAddress = !!clinicPage?.access?.address;
  const hasHours = !!(
    clinicPage?.hours?.weekday ||
    (clinicPage?.weeklySchedule &&
      Object.keys(clinicPage.weeklySchedule).length > 0)
  );
  const hasTreatments =
    clinicPage?.treatments && clinicPage.treatments.length > 0;

  // 全ての必要情報が入力されている場合は表示しない
  if (hasAddress && hasHours && hasTreatments) {
    return null;
  }

  // 不足している情報のリスト
  const missingItems: string[] = [];
  if (!hasAddress) missingItems.push("住所");
  if (!hasHours) missingItems.push("診療時間");
  if (!hasTreatments) missingItems.push("診療内容");

  return (
    <div className="rounded-lg border p-4 mb-6 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-amber-700">
            医院情報が未入力です。以下の情報を設定してください：
            <span className="font-medium ml-1">{missingItems.join("、")}</span>
          </p>
          <p className="text-xs mt-1 text-amber-700 opacity-80">
            医院紹介ページを充実させることで、患者様からの信頼度が向上します。
          </p>
        </div>
        <Link
          href="/dashboard/clinic"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Building2 className="w-4 h-4" />
          医院情報を設定
        </Link>
      </div>
    </div>
  );
}
