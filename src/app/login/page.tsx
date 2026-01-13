"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Building2, Search, ArrowLeft } from "lucide-react";

interface ClinicOption {
  id: string;
  name: string;
  email: string;
  slug: string;
  status: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 管理者用: 医院選択モード
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleDemoLogin = () => {
    setFormData({
      email: "test@gmail.com",
      password: "testtest",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        return;
      }

      // 管理者の場合、医院選択モードに移行
      if (data.requireClinicSelection) {
        setIsAdminMode(true);
        loadClinics("");
        return;
      }

      // ログイン成功、ダッシュボードへ遷移
      router.push("/dashboard");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClinics = async (search: string) => {
    setIsSearching(true);
    try {
      const response = await fetch("/api/auth/admin-clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          search,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClinics(data.clinics);
      }
    } catch (error) {
      console.error("Failed to load clinics:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClinics(searchQuery);
  };

  const handleSelectClinic = async (clinicId: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          clinicId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        return;
      }

      // ログイン成功、ダッシュボードへ遷移
      router.push("/dashboard");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsAdminMode(false);
    setClinics([]);
    setSearchQuery("");
  };

  // 管理者用: 医院選択画面
  if (isAdminMode) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">医院を選択</h1>
              <p className="text-gray-600 mt-2">管理する医院を選択してください</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="医院名またはメールで検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? "..." : "検索"}
                </Button>
              </div>
            </form>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {clinics.map((clinic) => (
                <button
                  key={clinic.id}
                  onClick={() => handleSelectClinic(clinic.id)}
                  disabled={isLoading}
                  className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium">{clinic.name}</div>
                  <div className="text-sm text-gray-500">{clinic.email}</div>
                  <div className="text-xs text-gray-400 mt-1">/{clinic.slug}</div>
                </button>
              ))}

              {clinics.length === 0 && !isSearching && (
                <div className="text-center text-gray-500 py-8">
                  医院が見つかりません
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
            <p className="text-gray-600 mt-2">医院アカウントにログイン</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@clinic.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="パスワードを入力"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            アカウントをお持ちでないですか？{" "}
            <Link href="/signup" className="text-primary hover:underline">
              新規登録
            </Link>
          </div>
        </div>

        {/* デモアカウント案内 */}
        <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">デモアカウント</h3>
              <p className="text-xs text-gray-600">管理画面を自由にお試しいただけます</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">メール</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">test@gmail.com</code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">パスワード</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">testtest</code>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={handleDemoLogin}
          >
            デモアカウントで入力
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:underline">
            ← トップページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
