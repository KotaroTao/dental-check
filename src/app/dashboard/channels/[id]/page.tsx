"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Download, Copy, ExternalLink, Image as ImageIcon, X,
  Calendar, Link2, Wallet, Upload, Loader2, Eye, Check,
} from "lucide-react";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
  "periodontal-risk": "歯周病リスク診断",
  "cavity-risk": "虫歯リスク診断",
  "whitening-check": "ホワイトニング適正診断",
};

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: string | null;
  scanCount: number;
  budget: number | null;
}

interface SubscriptionInfo {
  isDemo?: boolean;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    imageUrl: "" as string | null,
    redirectUrl: "",
    expiresAt: "",
    budget: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDemo = subscription?.isDemo;

  const baseUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : "";
  const qrUrl = channel
    ? channel.channelType === "diagnosis"
      ? `${baseUrl}/c/${channel.code}/${channel.diagnosisTypeSlug}`
      : `${baseUrl}/c/${channel.code}`
    : "";

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await fetch(`/api/channels/${id}`);
        if (response.ok) {
          const data = await response.json();
          setChannel(data.channel);

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
            budget: data.channel.budget !== null ? String(data.channel.budget) : "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch channel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/billing/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      }
    };

    if (id) {
      fetchChannel();
      fetchSubscription();
    }
  }, [id]);

  // QR code rendering
  useEffect(() => {
    if (channel && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [channel, qrUrl]);

  // Hash scroll
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

  // QR download handlers
  const handleDownloadPNG = () => {
    if (!canvasRef.current || !channel) return;
    const link = document.createElement("a");
    link.download = `qr-${channel.name}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleDownloadSVG = async () => {
    if (!channel) return;
    try {
      const svgString = await QRCode.toString(qrUrl, {
        type: "svg",
        width: 256,
        margin: 2,
      });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qr-${channel.name}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("SVG download error:", error);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaveSuccess(false);

    if (isDemo) {
      setShowDemoModal(true);
      return;
    }

    if (!formData.name.trim()) {
      setError("QRコード名を入力してください");
      return;
    }

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
          budget: formData.budget || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "QRコードの更新に失敗しました");
        return;
      }

      // Update local channel data
      setChannel((prev) => prev ? { ...prev, ...data.channel } : data.channel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          ダッシュボードに戻る
        </Link>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-red-600">{error || "QRコードが見つかりません"}</p>
        </div>
      </div>
    );
  }

  const diagnosisTypeName = channel.diagnosisTypeSlug
    ? DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        ダッシュボードに戻る
      </Link>

      {/* QR Code Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border mb-4">
            <canvas ref={canvasRef} />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {channel.channelType === "diagnosis"
              ? `このQRコードをスキャンすると「${diagnosisTypeName}」が開始されます`
              : "このQRコードをスキャンするとリダイレクト先URLに遷移します"}
          </p>

          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <Button onClick={handleDownloadPNG} className="gap-2">
              <Download className="w-4 h-4" />
              PNG
            </Button>
            <Button onClick={handleDownloadSVG} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              SVG
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  URLをコピー
                </>
              )}
            </Button>
          </div>

          <div className="w-full bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">
              {channel.channelType === "diagnosis" ? "診断URL" : "QRコードURL"}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                {qrUrl}
              </code>
              <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-6">設定</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {saveSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              保存しました
            </div>
          )}

          {/* Image upload */}
          <div className="space-y-2">
            <Label>画像</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
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
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!isDemo && (
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
                  )}
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
                  {!isUploading && !isDemo && (
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
                  <p className="text-xs text-gray-400 mt-3">JPG, PNG, GIF / 最大5MB</p>
                </div>
              )}
              <input
                id="image-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || !!isDemo}
              />
            </div>
          </div>

          {/* Name */}
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
              disabled={isSaving || !!isDemo}
            />
          </div>

          {/* Diagnosis type (read-only) */}
          {channel.channelType === "diagnosis" && channel.diagnosisTypeSlug && (
            <div className="space-y-2">
              <Label>診断タイプ</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                {DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug}
              </div>
              <p className="text-xs text-gray-500">診断タイプは変更できません</p>
            </div>
          )}

          {/* Redirect URL (link type) */}
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
                disabled={isSaving || !!isDemo}
              />
              <p className="text-xs text-gray-500">QRコードをスキャンした際のリダイレクト先URL</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <textarea
              id="description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="例: 2024年1月から駅前で配布するチラシ用"
              value={formData.description}
              onChange={handleChange}
              disabled={isSaving || !!isDemo}
            />
          </div>

          {/* Expires at */}
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
                disabled={isSaving || !!isDemo}
                className="flex-1"
              />
              {formData.expiresAt && !isDemo && (
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

          {/* Budget */}
          <div id="budget" className="space-y-2">
            <Label htmlFor="budget" className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-500" />
              予算（任意）
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  placeholder="例: 50000"
                  value={formData.budget}
                  onChange={handleChange}
                  disabled={isSaving || !!isDemo}
                  className="pl-7"
                />
              </div>
              {formData.budget && !isDemo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, budget: "" }))}
                  disabled={isSaving}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              このQRコードにかけた広告費用を入力すると、QR読み込み単価を確認できます。
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              disabled={isSaving || !!isDemo}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              このQRコードを有効にする
            </Label>
          </div>

          {/* Submit */}
          {!isDemo && (
            <div className="pt-4">
              <Button type="submit" disabled={isSaving || isUploading} className="w-full">
                {isSaving ? "保存中..." : "変更を保存"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Image modal */}
      {showImageModal && formData.imageUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={formData.imageUrl}
              alt={channel.name}
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Demo modal */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">デモアカウントです</h3>
                <p className="text-sm text-gray-600 mt-1">
                  デモアカウントでは、データの閲覧のみ可能です。
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800">
                QRコードの編集を行うには、正式なアカウントでのご登録が必要です。
              </p>
            </div>
            <Button className="w-full" onClick={() => setShowDemoModal(false)}>
              閉じる
            </Button>
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
