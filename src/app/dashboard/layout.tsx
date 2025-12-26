"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Clinic {
  id: string;
  name: string;
  email: string;
  slug: string;
  status: string;
  subscription: {
    status: string;
    trialEnd: string | null;
  } | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setClinic(data.clinic);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const getTrialDaysLeft = () => {
    if (!clinic?.subscription?.trialEnd) return null;
    const trialEnd = new Date(clinic.subscription.trialEnd);
    const now = new Date();
    const diff = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  };

  const trialDaysLeft = getTrialDaysLeft();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-bold text-xl">
              歯科集患ツール
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ダッシュボード
              </Link>
              <Link
                href="/dashboard/channels"
                className="text-gray-600 hover:text-gray-900"
              >
                経路・QRコード
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                設定
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {clinic?.subscription?.status === "trial" && trialDaysLeft !== null && (
              <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                トライアル残り {trialDaysLeft} 日
              </span>
            )}
            <span className="text-sm text-gray-600 hidden sm:block">
              {clinic?.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
