"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, FileText, LogOut, Building2, Menu, X, Megaphone } from "lucide-react";

interface Admin {
  id: string;
  name: string | null;
  email: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ログインページの場合はレイアウトなしで表示
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch("/api/admin/auth/me");
        if (response.ok) {
          const data = await response.json();
          setAdmin(data.admin);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // キャッシュをクリアしてハードリダイレクト
    window.location.href = "/admin/login";
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー
          - 〜639px(sm未満): ハンバーガーメニュー
          - 640px〜(sm): ナビとログアウトを表示。アイコン優先で文字を短縮し、
            iPad mini portrait(744px) や Split View でも崩れないようにする
          - 1024px〜(lg): メールアドレスも併記 */}
      <header className="bg-gray-900 text-white sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0">
            <Link href="/admin/clinics" className="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden lg:inline">管理者パネル</span>
              <span className="lg:hidden">管理</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-2 sm:gap-3 lg:gap-5">
              <Link
                href="/admin/clinics"
                className={`flex items-center gap-1.5 text-sm whitespace-nowrap hover:text-gray-300 ${
                  pathname.startsWith("/admin/clinics") ? "text-white" : "text-gray-400"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                医院管理
              </Link>
              <Link
                href="/admin/diagnoses"
                className={`flex items-center gap-1.5 text-sm whitespace-nowrap hover:text-gray-300 ${
                  pathname.startsWith("/admin/diagnoses") ? "text-white" : "text-gray-400"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                診断管理
              </Link>
              <Link
                href="/admin/flyer-analysis"
                className={`flex items-center gap-1.5 text-sm whitespace-nowrap hover:text-gray-300 ${
                  pathname.startsWith("/admin/flyer-analysis") ? "text-white" : "text-gray-400"
                }`}
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                QR効果分析
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-xs text-gray-400 hidden lg:block truncate max-w-[200px]">
              {admin?.email}
            </span>
            {/* sm 以上で常にログアウトボタン表示。アイコンのみ + テキストでコンパクト */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex text-gray-300 hover:text-white hover:bg-gray-800 px-2 sm:px-3"
            >
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden md:inline">ログアウト</span>
            </Button>
            {/* ハンバーガーメニューボタン（sm未満のみ） */}
            <button
              className="sm:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* モバイルメニュー（sm未満のみ） */}
        {isMenuOpen && (
          <nav className="sm:hidden bg-gray-800 border-t border-gray-700">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link
                href="/admin/clinics"
                className={`flex items-center gap-2 py-2 ${
                  pathname.startsWith("/admin/clinics") ? "text-white" : "text-gray-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Building2 className="w-4 h-4" />
                医院管理
              </Link>
              <Link
                href="/admin/diagnoses"
                className={`flex items-center gap-2 py-2 ${
                  pathname.startsWith("/admin/diagnoses") ? "text-white" : "text-gray-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <FileText className="w-4 h-4" />
                診断管理
              </Link>
              <Link
                href="/admin/flyer-analysis"
                className={`flex items-center gap-2 py-2 ${
                  pathname.startsWith("/admin/flyer-analysis") ? "text-white" : "text-gray-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Megaphone className="w-4 h-4" />
                QR効果分析
              </Link>
              <div className="border-t border-gray-700 pt-4 mt-2">
                <span className="text-sm text-gray-400 block mb-2 truncate">
                  {admin?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-300 hover:text-white py-2"
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
