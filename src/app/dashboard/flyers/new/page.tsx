"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

// チラシの「配布方法」プルダウン候補（管理者集計画面と同じ候補に合わせる）
const METHOD_OPTIONS = [
  "ポスティング",
  "新聞折込",
  "DM",
  "メール",
  "LP (広告から誘導)",
  "その他",
];

export default function NewFlyerPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  // チラシ画像のアップロードは、ここでは行わず編集ページに譲る（最初は最小限の項目で作成→詳細編集の流れ）
  const [formData, setFormData] = useState({
    name: "",
    distributionMethod: "",
    distributionQuantity: "",
    distributionPeriod: "",
    budget: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("チラシ名を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/flyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          distributionMethod: formData.distributionMethod || null,
          distributionQuantity: formData.distributionQuantity || null,
          distributionPeriod: formData.distributionPeriod || null,
          budget: formData.budget || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "チラシの作成に失敗しました");
        setIsSaving(false);
        return;
      }
      // 作成後は編集ページにリダイレクト（画像追加・詳細編集はそちらで）
      router.push(`/dashboard/flyers/${data.flyer.id}`);
    } catch {
      setError("通信エラーが発生しました");
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/flyers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規チラシ作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>チラシ情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">チラシ名（必須）</Label>
              <Input
                id="name"
                name="name"
                placeholder="例: 2024年春チラシ、駅前ポスティング第1弾"
                value={formData.name}
                onChange={handleChange}
                disabled={isSaving}
                required
              />
              <p className="text-xs text-gray-500">
                同じチラシに複数のQRを掲載する場合、各QRから「このチラシ」を選べるようになります。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distributionMethod">配布方法</Label>
                <select
                  id="distributionMethod"
                  name="distributionMethod"
                  value={formData.distributionMethod}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">未設定</option>
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distributionPeriod">配布期間</Label>
                <Input
                  id="distributionPeriod"
                  name="distributionPeriod"
                  placeholder="例: 2024年1月〜3月"
                  value={formData.distributionPeriod}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distributionQuantity">配布枚数</Label>
                <div className="relative">
                  <Input
                    id="distributionQuantity"
                    name="distributionQuantity"
                    type="number"
                    min="0"
                    placeholder="例: 5000"
                    value={formData.distributionQuantity}
                    onChange={handleChange}
                    disabled={isSaving}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">枚</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">予算</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    min="0"
                    placeholder="例: 50000"
                    value={formData.budget}
                    onChange={handleChange}
                    disabled={isSaving}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              チラシ画像（表 / 裏）は作成後の編集ページでアップロードできます。
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "チラシを作成"
                )}
              </Button>
              <Link href="/dashboard/flyers">
                <Button type="button" variant="outline" disabled={isSaving}>
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
