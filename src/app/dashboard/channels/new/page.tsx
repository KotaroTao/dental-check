"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

// 利用可能な診断タイプ
const DIAGNOSIS_TYPES = [
  { slug: "oral-age", name: "お口年齢診断" },
  { slug: "child-orthodontics", name: "子供の矯正タイミングチェック" },
];

export default function NewChannelPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    diagnosisTypeSlug: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("経路名を入力してください");
      return;
    }

    if (!formData.diagnosisTypeSlug) {
      setError("診断タイプを選択してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "経路の作成に失敗しました");
        return;
      }

      // 作成した経路の詳細ページへ
      router.push(`/dashboard/channels/${data.channel.id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        ダッシュボードに戻る
      </Link>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-xl font-bold mb-6">新しい経路を作成</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              経路名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="例: チラシ①（駅前配布）"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              どこで使うQRコードか分かる名前をつけてください
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosisTypeSlug">
              診断タイプ <span className="text-red-500">*</span>
            </Label>
            <select
              id="diagnosisTypeSlug"
              name="diagnosisTypeSlug"
              value={formData.diagnosisTypeSlug}
              onChange={handleChange}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {DIAGNOSIS_TYPES.map((type) => (
                <option key={type.slug} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              この経路で使用する診断を選択してください
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <textarea
              id="description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="例: 2024年1月から駅前で配布するチラシ用"
              value={formData.description}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "作成中..." : "経路を作成"}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline" disabled={isLoading}>
                キャンセル
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
