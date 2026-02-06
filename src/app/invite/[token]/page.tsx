"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "valid" | "error" | "success">("loading");
  const [tokenType, setTokenType] = useState<"invitation" | "password_reset">("invitation");
  const [clinicName, setClinicName] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setErrorMessage(data.error || "無効なURLです");
          return;
        }

        setStatus("valid");
        setTokenType(data.type);
        setClinicName(data.clinicName);
        setClinicEmail(data.clinicEmail);
      } catch {
        setStatus("error");
        setErrorMessage("確認に失敗しました");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!password || password.length < 8) {
      setFormError("パスワードは8文字以上で入力してください");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("パスワードが一致しません");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || "設定に失敗しました");
        return;
      }

      setStatus("success");

      // 3秒後にダッシュボードへ
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch {
      setFormError("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === "loading" && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">確認中...</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Button variant="outline" onClick={() => router.push("/login")}>
              ログインページへ
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {tokenType === "invitation" ? "アカウント設定完了" : "パスワード変更完了"}
            </h1>
            <p className="text-gray-600 mb-2">
              {tokenType === "invitation"
                ? "アカウントの設定が完了しました。"
                : "パスワードを変更しました。"}
            </p>
            <p className="text-sm text-gray-500">
              3秒後にダッシュボードに移動します...
            </p>
          </div>
        )}

        {status === "valid" && (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {tokenType === "invitation" ? "アカウント設定" : "パスワード再設定"}
              </h1>
              <p className="text-gray-600 mt-2">
                {tokenType === "invitation"
                  ? `${clinicName}のパスワードを設定してください`
                  : "新しいパスワードを設定してください"}
              </p>
              {tokenType === "invitation" && (
                <p className="text-sm text-gray-500 mt-1">
                  ログインメール: <span className="font-medium">{clinicEmail}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">
                  {tokenType === "invitation" ? "パスワード" : "新しいパスワード"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="もう一度入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "設定中..."
                  : tokenType === "invitation"
                  ? "アカウントを設定"
                  : "パスワードを変更"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
