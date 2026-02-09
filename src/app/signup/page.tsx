"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // B5: リアルタイムパスワードバリデーション
  const passwordChecks = useMemo(() => {
    const pw = formData.password;
    return {
      length: pw.length >= 8,
      hasLetter: /[a-zA-Z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
    };
  }, [formData.password]);

  const passwordMatch = formData.password.length > 0 &&
    formData.passwordConfirm.length > 0 &&
    formData.password === formData.passwordConfirm;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!formData.name || !formData.email || !formData.password) {
      setError("必須項目を入力してください");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    if (formData.password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    if (!/[a-zA-Z]/.test(formData.password)) {
      setError("パスワードには英字を1文字以上含めてください");
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError("パスワードには数字を1文字以上含めてください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }

      // 登録成功、ダッシュボードへ遷移
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
            <h1 className="text-2xl font-bold text-gray-900">医院登録</h1>
            <p className="text-gray-600 mt-2">14日間無料でお試しいただけます</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                医院名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="例: さくら歯科クリニック"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="03-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="英字と数字を含む8文字以上"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              {/* B5: リアルタイムバリデーション表示 */}
              {formData.password.length > 0 && (
                <div className="space-y-1 mt-1.5">
                  <PasswordCheck passed={passwordChecks.length} label="8文字以上" />
                  <PasswordCheck passed={passwordChecks.hasLetter} label="英字を含む" />
                  <PasswordCheck passed={passwordChecks.hasNumber} label="数字を含む" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">
                パスワード（確認） <span className="text-red-500">*</span>
              </Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="パスワードを再入力"
                value={formData.passwordConfirm}
                onChange={handleChange}
                disabled={isLoading}
              />
              {formData.passwordConfirm.length > 0 && (
                <PasswordCheck
                  passed={passwordMatch}
                  label={passwordMatch ? "パスワードが一致" : "パスワードが一致しません"}
                />
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "登録中..." : "無料で登録する"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="text-primary hover:underline">
              ログイン
            </Link>
          </div>
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

/** パスワード条件の合否を表示するミニコンポーネント */
function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${passed ? "text-green-600" : "text-gray-400"}`}>
      {passed ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </div>
  );
}
