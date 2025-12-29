"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Info, CreditCard } from "lucide-react";
import Link from "next/link";

interface SubscriptionInfo {
  status: string;
  planType: string;
  planName: string;
  trialDaysLeft: number | null;
  gracePeriodDaysLeft: number | null;
  qrCodeLimit: number | null;
  qrCodeCount: number;
  remainingQRCodes: number | null;
  canCreateQR: boolean;
  canTrack: boolean;
  message: string | null;
  alertType: "info" | "warning" | "error" | null;
}

export function SubscriptionAlert() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/billing/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (isLoading || !subscription) {
    return null;
  }

  // アラートが不要な場合は表示しない
  if (!subscription.alertType && !subscription.message) {
    return null;
  }

  const getAlertStyles = () => {
    switch (subscription.alertType) {
      case "error":
        return {
          container: "bg-red-50 border-red-200",
          icon: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
          text: "text-red-700",
          button: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "warning":
        return {
          container: "bg-amber-50 border-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
          text: "text-amber-700",
          button: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "info":
      default:
        return {
          container: "bg-blue-50 border-blue-200",
          icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
          text: "text-blue-700",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
        };
    }
  };

  const styles = getAlertStyles();

  // 契約ページへ誘導が必要な状態かどうか
  const needsAction =
    subscription.status === "expired" ||
    subscription.status === "grace_period" ||
    subscription.status === "past_due" ||
    (subscription.status === "trial" && subscription.trialDaysLeft !== null && subscription.trialDaysLeft <= 3);

  return (
    <div className={`rounded-lg border p-4 mb-6 ${styles.container}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="flex-1">
          <p className={`text-sm ${styles.text}`}>{subscription.message}</p>

          {/* QRコード制限情報 */}
          {subscription.qrCodeLimit !== null && (
            <p className={`text-xs mt-1 ${styles.text} opacity-80`}>
              QRコード: {subscription.qrCodeCount} / {subscription.qrCodeLimit} 枚使用中
              {subscription.remainingQRCodes !== null && subscription.remainingQRCodes > 0 && (
                <span className="ml-2">（残り {subscription.remainingQRCodes} 枚作成可能）</span>
              )}
            </p>
          )}

          {/* 計測不可の場合の警告 */}
          {!subscription.canTrack && (
            <p className={`text-xs mt-1 ${styles.text} opacity-80`}>
              ※ 現在、診断の計測が停止されています
            </p>
          )}
        </div>

        {needsAction && (
          <Link
            href="/dashboard/billing"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.button}`}
          >
            <CreditCard className="w-4 h-4" />
            契約を確認
          </Link>
        )}
      </div>
    </div>
  );
}
