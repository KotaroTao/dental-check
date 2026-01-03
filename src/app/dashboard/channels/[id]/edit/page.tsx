"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, X, Loader2, Image as ImageIcon, Calendar, Link2 } from "lucide-react";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
};

interface Channel {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: string | null;
}

export default function EditChannelPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    imageUrl: "" as string | null,
    redirectUrl: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // デモアカウントはリダイレクト
  useEffect(() => {
    const checkDemo = async () => {
      try {
        const response = await fetch("/api/billing/subscription");
        if (response.ok) {
          const data = await response.json();
          if (data.subscription?.isDemo) {
            router.replace("/dashboard");
          }
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
      }
    };
    checkDemo();
  }, [router]);

  // ハッシュアンカーへのスクロール対応
  useEffect(() => {
    if (!isLoading && channel && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  }, [isLoading, channel]);

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await fetch(`/api/channels/${id}`);
        if (response.ok) {
          const data = await response.json();
          setChannel(data.channel);
          // 有効期限をdatetime-local形式に変換
          let expiresAtValue = "";
          if (data.channel.expiresAt) {
            const date = new Date(data.channel.expiresAt);
            expiresAtValue = date.toISOString().slice(0, 16);
          }

          setFormData({
            name: data.channel.name,
            description: data.channel.description || "",
            isActive: data.channel.isActive,
            imageUrl: data.channel.imageUrl || null,
            redirectUrl: data.channel.redirectUrl || "",
            expiresAt: expiresAtValue,
          });
        } else {
          setError("QRコードが見つかりません");
        }
      } catch {
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannel();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // 画像圧縮
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // 画像アップロード
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以下にしてください");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const compressedFile = await compressImage(file);
      const uploadFormData = new FormData();
      uploadFormData.append("file", compressedFile);
      uploadFormData.append("folder", "channels");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "アップロードに失敗しました");
      }

      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ドラッグ&ドロップ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // 画像削除
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("QRコード名を入力してください");
      return;
    }

    // リンクタイプの場合はURLの検証
    if (channel?.channelType === "link") {
      if (!formData.redirectUrl.trim()) {
        setError("リダイレクト先URLを入力してください");
        return;
      }
      try {
        new URL(formData.redirectUrl);
      } catch {
        setError("有効なURLを入力してください（https://で始まる形式）");
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
          imageUrl: formData.imageUrl,
          expiresAt: formData.expiresAt || null,
          redirectUrl: channel?.channelType === "link" ? formData.redirectUrl : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "QRコードの更新に失敗しました");
        return;
      }

      router.push(`/dashboard/channels/${id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!channel) {
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
          <p className="text-red-600">{error || "QRコードが見つかりません"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/dashboard/channels/${id}`}
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        QRコード詳細に戻る
      </Link>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-xl font-bold mb-6">QRコードを編集</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 画像アップロード */}
          <div className="space-y-2">
            <Label>画像</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {formData.imageUrl ? (
                <div className="relative aspect-video">
                  <img
                    src={formData.imageUrl}
                    alt="プレビュー"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById("image-input")?.click()}
                      disabled={isUploading}
                      className="bg-white/90 hover:bg-white"
                    >
                      変更
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isUploading}
                      className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 mx-auto text-gray-400 animate-spin mb-2" />
                  ) : (
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    {isUploading ? "アップロード中..." : "ドラッグ&ドロップ または"}
                  </p>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("image-input")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      ファイルを選択
                    </Button>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    JPG, PNG, GIF / 最大5MB
                  </p>
                </div>
              )}
              <input
                id="image-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              QRコード名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="例: チラシ①（駅前配布）"
              value={formData.name}
              onChange={handleChange}
              disabled={isSaving}
            />
          </div>

          {/* 診断タイプ表示（診断タイプの場合） */}
          {channel.channelType === "diagnosis" && channel.diagnosisTypeSlug && (
            <div className="space-y-2">
              <Label>診断タイプ</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                {DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug}
              </div>
              <p className="text-xs text-gray-500">
                診断タイプは変更できません
              </p>
            </div>
          )}

          {/* リダイレクトURL入力（リンクタイプの場合） */}
          {channel.channelType === "link" && (
            <div className="space-y-2">
              <Label htmlFor="redirectUrl" className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-500" />
                リダイレクト先URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="redirectUrl"
                name="redirectUrl"
                type="url"
                placeholder="https://example.com/page"
                value={formData.redirectUrl}
                onChange={handleChange}
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500">
                QRコードをスキャンした際のリダイレクト先URL
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <textarea
              id="description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="例: 2024年1月から駅前で配布するチラシ用"
              value={formData.description}
              onChange={handleChange}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              有効期限（任意）
            </Label>
            <div className="flex gap-2">
              <Input
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={handleChange}
                disabled={isSaving}
                className="flex-1"
              />
              {formData.expiresAt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, expiresAt: "" }))}
                  disabled={isSaving}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              期限を過ぎるとQRコードは無効になります。空欄の場合は無期限です。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSaving}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              このQRコードを有効にする
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSaving || isUploading} className="flex-1">
              {isSaving ? "保存中..." : "変更を保存"}
            </Button>
            <Link href={`/dashboard/channels/${id}`}>
              <Button type="button" variant="outline" disabled={isSaving}>
                キャンセル
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
