"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // D2: 2段階認証
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [totpCode, setTotpCode] = useState("");

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
        body: JSON.stringify({
          ...formData,
          ...(requiresTOTP ? { totpCode } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ログインに失敗しました");
        return;
      }

      // D2: 2段階認証が必要な場合
      if (data.requiresTOTP) {
        setRequiresTOTP(true);
        setTotpCode("");
        setError("");
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
                disabled={isLoading || requiresTOTP}
              />
            </div>

            {/* D2: 2段階認証コード入力 */}
            {requiresTOTP && (
              <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label htmlFor="totpCode" className="text-blue-800 font-medium">
                  認証コード（6桁）
                </Label>
                <p className="text-xs text-blue-600">
                  認証アプリに表示されている6桁のコードを入力してください
                </p>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-gray-500 hover:underline">
              パスワードをお忘れの方
            </Link>
          </div>

          <div className="mt-3 text-center text-sm text-gray-600">
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
