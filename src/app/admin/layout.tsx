"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, FileText, LogOut, BarChart3, Building2, Menu, X } from "lucide-react";

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
      {/* ヘッダー */}
      <header className="bg-gray-900 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin/clinics" className="flex items-center gap-2 font-bold text-xl">
              <Shield className="w-6 h-6" />
              <span className="hidden sm:inline">管理者パネル</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/admin/clinics"
                className={`flex items-center gap-2 hover:text-gray-300 ${
                  pathname.startsWith("/admin/clinics") ? "text-white" : "text-gray-400"
                }`}
              >
                <Building2 className="w-4 h-4" />
                医院管理
              </Link>
              <Link
                href="/admin/diagnoses"
                className={`flex items-center gap-2 hover:text-gray-300 ${
                  pathname.startsWith("/admin/diagnoses") ? "text-white" : "text-gray-400"
                }`}
              >
                <FileText className="w-4 h-4" />
                診断管理
              </Link>
              <Link
                href="/admin/stats"
                className={`flex items-center gap-2 hover:text-gray-300 ${
                  pathname.startsWith("/admin/stats") ? "text-white" : "text-gray-400"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                統計
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">
              {admin?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300 hover:text-white hover:bg-gray-800 hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
            {/* ハンバーガーメニューボタン */}
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* モバイルメニュー */}
        {isMenuOpen && (
          <nav className="md:hidden bg-gray-800 border-t border-gray-700">
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
                href="/admin/stats"
                className={`flex items-center gap-2 py-2 ${
                  pathname.startsWith("/admin/stats") ? "text-white" : "text-gray-400"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <BarChart3 className="w-4 h-4" />
                統計
              </Link>
              <div className="border-t border-gray-700 pt-4 mt-2">
                <span className="text-sm text-gray-400 block mb-2">
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
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
