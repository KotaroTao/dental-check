"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";

// チラシ作成時の「配布方法」候補
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
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    distributionMethod: "",
    distributionQuantity: "",
    distributionPeriod: "",
    budget: "",
    description: "",
    imageUrl: "" as string | "",
    imageUrl2: "" as string | "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 画像アップロード（表面/裏面）。サーバーに送らずに先にアップロードしてURLを得る方式
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFront = side === "front";
    if (isFront) setUploadingFront(true);
    else setUploadingBack(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const { url } = await res.json();
      setFormData((prev) => ({
        ...prev,
        ...(isFront ? { imageUrl: url } : { imageUrl2: url }),
      }));
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      if (isFront) setUploadingFront(false);
      else setUploadingBack(false);
      e.target.value = "";
    }
  };

  const handleImageRemove = (side: "front" | "back") => {
    setFormData((prev) => ({
      ...prev,
      ...(side === "front" ? { imageUrl: "" } : { imageUrl2: "" }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("チラシ名を入力してください");
      return;
    }
    if (!formData.distributionMethod) {
      setError("配布方法を選択してください");
      return;
    }
    if (!formData.imageUrl) {
      setError("チラシ表面の画像をアップロードしてください");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/flyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          distributionMethod: formData.distributionMethod,
          distributionQuantity: formData.distributionQuantity || null,
          distributionPeriod: formData.distributionPeriod || null,
          budget: formData.budget || null,
          imageUrl: formData.imageUrl,
          imageUrl2: formData.imageUrl2 || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "チラシの作成に失敗しました");
        setIsSaving(false);
        return;
      }
      // 作成後はチラシ編集ページへ。そのまま「+QRを追加」できる。
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* チラシ名（必須） */}
            <div className="space-y-2">
              <Label htmlFor="name">
                チラシ名 <span className="text-rose-600 text-xs">必須</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="例: 2024年春チラシ、駅前ポスティング第1弾"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">
                同じチラシに複数のQRを掲載する場合、各QRから「このチラシ」を選べるようになります。
              </p>
            </div>

            {/* チラシ画像（表必須・裏任意） */}
            <div className="space-y-2">
              <Label>
                チラシ画像 <span className="text-rose-600 text-xs">表面必須</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploaderField
                  label="表面（必須）"
                  url={formData.imageUrl}
                  isUploading={uploadingFront}
                  onUpload={(e) => handleImageUpload(e, "front")}
                  onRemove={() => handleImageRemove("front")}
                />
                <ImageUploaderField
                  label="裏面（任意）"
                  url={formData.imageUrl2}
                  isUploading={uploadingBack}
                  onUpload={(e) => handleImageUpload(e, "back")}
                  onRemove={() => handleImageRemove("back")}
                />
              </div>
            </div>

            {/* 配布方法（必須） + 配布期間 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distributionMethod">
                  配布方法 <span className="text-rose-600 text-xs">必須</span>
                </Label>
                <select
                  id="distributionMethod"
                  name="distributionMethod"
                  value={formData.distributionMethod}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distributionPeriod">配布期間（任意）</Label>
                <Input
                  id="distributionPeriod"
                  name="distributionPeriod"
                  placeholder="例: 2024年1月〜3月"
                  value={formData.distributionPeriod}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 配布枚数 + 予算 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distributionQuantity">配布枚数（任意）</Label>
                <div className="relative">
                  <Input
                    id="distributionQuantity"
                    name="distributionQuantity"
                    type="number"
                    min="0"
                    placeholder="例: 5000"
                    value={formData.distributionQuantity}
                    onChange={handleChange}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    枚
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">予算（任意）</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ¥
                  </span>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    min="0"
                    placeholder="例: 50000"
                    value={formData.budget}
                    onChange={handleChange}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* 備考 */}
            <div className="space-y-2">
              <Label htmlFor="description">備考（任意）</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="メモや備考を自由に記入できます"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSaving || uploadingFront || uploadingBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    作成中...
                  </>
                ) : (
                  "チラシを作成してQR追加へ"
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

// 画像アップローダー（チラシ作成・編集どちらでも共通利用するUI）
function ImageUploaderField({
  label,
  url,
  isUploading,
  onUpload,
  onRemove,
}: {
  label: string;
  url: string | "";
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">{label}</div>
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            // チラシ全体が見えるよう object-contain にし、余白には背景色を敷く
            className="w-full h-48 object-contain rounded border bg-gray-50"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            削除
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-300" />
              <span className="text-xs text-gray-500 mt-2 flex items-center">
                <Upload className="w-3 h-3 mr-1" />
                クリックして画像をアップロード
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
