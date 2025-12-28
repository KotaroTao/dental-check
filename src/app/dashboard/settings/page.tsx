"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, AlertCircle, Eye, Phone, Calendar, MapPin, MessageCircle } from "lucide-react";
import type { CustomCTA } from "@/types/clinic";

// URL検証関数
function isValidUrl(url: string): boolean {
  if (!url) return true; // 空は許可
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 電話番号検証関数
function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\-\+\(\)\s]+$/.test(phone);
}

interface ClinicSettings {
  name: string;
  logoUrl: string;
  mainColor: string;
  ctaConfig: {
    bookingUrl?: string;
    lineUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    facebookUrl?: string;
    tiktokUrl?: string;
    threadsUrl?: string;
    xUrl?: string;
    googleMapsUrl?: string;
    phone?: string;
    directorMessage?: string;
    customCTAs?: CustomCTA[];
    ctaOrder?: string[];
  };
}

// デフォルトのボタン順序
const DEFAULT_CTA_ORDER = ["phone", "booking", "line", "googleMaps", "instagram"];

// ボタンの表示名
const CTA_BUTTON_NAMES: Record<string, string> = {
  phone: "電話予約",
  booking: "WEB予約",
  line: "LINE",
  googleMaps: "Googleマップ",
  instagram: "Instagram",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>({
    name: "",
    logoUrl: "",
    mainColor: "#2563eb",
    ctaConfig: {},
  });
  const [originalSettings, setOriginalSettings] = useState<ClinicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // 未保存の変更があるかチェック
  const hasUnsavedChanges = useCallback(() => {
    if (!originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // バリデーション実行
  const validateSettings = useCallback(() => {
    const errors: Record<string, string> = {};
    const urlFields = [
      "bookingUrl", "lineUrl", "googleMapsUrl", "instagramUrl",
      "youtubeUrl", "facebookUrl", "tiktokUrl", "threadsUrl", "xUrl"
    ];

    for (const field of urlFields) {
      const value = settings.ctaConfig[field as keyof typeof settings.ctaConfig] as string | undefined;
      if (value && !isValidUrl(value)) {
        errors[field] = "有効なURLを入力してください";
      }
    }

    if (settings.ctaConfig.phone && !isValidPhone(settings.ctaConfig.phone)) {
      errors.phone = "有効な電話番号を入力してください";
    }

    if (settings.logoUrl && !isValidUrl(settings.logoUrl)) {
      errors.logoUrl = "有効なURLを入力してください";
    }

    // カスタムCTAのバリデーション
    settings.ctaConfig.customCTAs?.forEach((cta, index) => {
      if (cta.url && !isValidUrl(cta.url)) {
        errors[`customCTA_${index}_url`] = "有効なURLを入力してください";
      }
      if (cta.label && cta.label.length > 20) {
        errors[`customCTA_${index}_label`] = "ラベルは20文字以内にしてください";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [settings]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const loadedSettings = {
            name: data.clinic.name || "",
            logoUrl: data.clinic.logoUrl || "",
            mainColor: data.clinic.mainColor || "#2563eb",
            ctaConfig: data.clinic.ctaConfig || {},
          };
          setSettings(loadedSettings);
          setOriginalSettings(loadedSettings);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("cta.")) {
      const ctaField = name.replace("cta.", "");
      setSettings({
        ...settings,
        ctaConfig: { ...settings.ctaConfig, [ctaField]: value },
      });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  // カスタムCTAの追加
  const addCustomCTA = () => {
    const newCTA: CustomCTA = {
      id: `custom_${Date.now()}`,
      label: "",
      url: "",
      color: settings.mainColor,
    };
    setSettings({
      ...settings,
      ctaConfig: {
        ...settings.ctaConfig,
        customCTAs: [...(settings.ctaConfig.customCTAs || []), newCTA],
      },
    });
  };

  // カスタムCTAの更新
  const updateCustomCTA = (index: number, field: keyof CustomCTA, value: string) => {
    const customCTAs = [...(settings.ctaConfig.customCTAs || [])];
    customCTAs[index] = { ...customCTAs[index], [field]: value };
    setSettings({
      ...settings,
      ctaConfig: { ...settings.ctaConfig, customCTAs },
    });
  };

  // カスタムCTAの削除
  const removeCustomCTA = (index: number) => {
    const customCTAs = [...(settings.ctaConfig.customCTAs || [])];
    customCTAs.splice(index, 1);
    setSettings({
      ...settings,
      ctaConfig: { ...settings.ctaConfig, customCTAs },
    });
  };

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const order = settings.ctaConfig.ctaOrder || DEFAULT_CTA_ORDER;
    const newOrder = [...order];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);

    setSettings({
      ...settings,
      ctaConfig: { ...settings.ctaConfig, ctaOrder: newOrder },
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // バリデーション実行
    if (!validateSettings()) {
      setMessage({ type: "error", text: "入力内容にエラーがあります。各フィールドを確認してください。" });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/clinic/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
        setOriginalSettings(settings); // 保存成功後、原本を更新
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  const ctaOrder = settings.ctaConfig.ctaOrder || DEFAULT_CTA_ORDER;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 基本設定 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">基本設定</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">医院名</Label>
              <Input
                id="name"
                name="name"
                value={settings.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">ロゴURL</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                value={settings.logoUrl}
                onChange={handleChange}
                className={validationErrors.logoUrl ? "border-red-500" : ""}
              />
              {validationErrors.logoUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.logoUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainColor">テーマカラー</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="mainColor"
                  name="mainColor"
                  value={settings.mainColor}
                  onChange={handleChange}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  name="mainColor"
                  value={settings.mainColor}
                  onChange={handleChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA設定 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">結果画面のCTA設定</h2>
          <p className="text-sm text-gray-500 mb-4">
            診断結果ページに表示するボタンやリンクを設定します
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cta.bookingUrl">予約ページURL</Label>
              <Input
                id="cta.bookingUrl"
                name="cta.bookingUrl"
                type="url"
                placeholder="https://example.com/booking"
                value={settings.ctaConfig.bookingUrl || ""}
                onChange={handleChange}
                className={validationErrors.bookingUrl ? "border-red-500" : ""}
              />
              {validationErrors.bookingUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.bookingUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.lineUrl">LINE公式アカウントURL</Label>
              <Input
                id="cta.lineUrl"
                name="cta.lineUrl"
                type="url"
                placeholder="https://line.me/R/ti/p/@xxx"
                value={settings.ctaConfig.lineUrl || ""}
                onChange={handleChange}
                className={validationErrors.lineUrl ? "border-red-500" : ""}
              />
              {validationErrors.lineUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.lineUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.googleMapsUrl">GoogleマップURL</Label>
              <Input
                id="cta.googleMapsUrl"
                name="cta.googleMapsUrl"
                type="url"
                placeholder="https://maps.google.com/..."
                value={settings.ctaConfig.googleMapsUrl || ""}
                onChange={handleChange}
                className={validationErrors.googleMapsUrl ? "border-red-500" : ""}
              />
              {validationErrors.googleMapsUrl ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.googleMapsUrl}
                </p>
              ) : (
                <p className="text-xs text-gray-500">医院の場所をGoogleマップで開くリンク</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.instagramUrl">InstagramURL</Label>
              <Input
                id="cta.instagramUrl"
                name="cta.instagramUrl"
                type="url"
                placeholder="https://instagram.com/xxx"
                value={settings.ctaConfig.instagramUrl || ""}
                onChange={handleChange}
                className={validationErrors.instagramUrl ? "border-red-500" : ""}
              />
              {validationErrors.instagramUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.instagramUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.youtubeUrl">YouTubeチャンネルURL</Label>
              <Input
                id="cta.youtubeUrl"
                name="cta.youtubeUrl"
                type="url"
                placeholder="https://youtube.com/@xxx"
                value={settings.ctaConfig.youtubeUrl || ""}
                onChange={handleChange}
                className={validationErrors.youtubeUrl ? "border-red-500" : ""}
              />
              {validationErrors.youtubeUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.youtubeUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.facebookUrl">FacebookページURL</Label>
              <Input
                id="cta.facebookUrl"
                name="cta.facebookUrl"
                type="url"
                placeholder="https://facebook.com/xxx"
                value={settings.ctaConfig.facebookUrl || ""}
                onChange={handleChange}
                className={validationErrors.facebookUrl ? "border-red-500" : ""}
              />
              {validationErrors.facebookUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.facebookUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.tiktokUrl">TikTokURL</Label>
              <Input
                id="cta.tiktokUrl"
                name="cta.tiktokUrl"
                type="url"
                placeholder="https://tiktok.com/@xxx"
                value={settings.ctaConfig.tiktokUrl || ""}
                onChange={handleChange}
                className={validationErrors.tiktokUrl ? "border-red-500" : ""}
              />
              {validationErrors.tiktokUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.tiktokUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.threadsUrl">ThreadsURL</Label>
              <Input
                id="cta.threadsUrl"
                name="cta.threadsUrl"
                type="url"
                placeholder="https://threads.net/@xxx"
                value={settings.ctaConfig.threadsUrl || ""}
                onChange={handleChange}
                className={validationErrors.threadsUrl ? "border-red-500" : ""}
              />
              {validationErrors.threadsUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.threadsUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.xUrl">X（Twitter）URL</Label>
              <Input
                id="cta.xUrl"
                name="cta.xUrl"
                type="url"
                placeholder="https://x.com/xxx"
                value={settings.ctaConfig.xUrl || ""}
                onChange={handleChange}
                className={validationErrors.xUrl ? "border-red-500" : ""}
              />
              {validationErrors.xUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.xUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.phone">電話番号</Label>
              <Input
                id="cta.phone"
                name="cta.phone"
                type="tel"
                placeholder="03-1234-5678"
                value={settings.ctaConfig.phone || ""}
                onChange={handleChange}
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.directorMessage">院長からのメッセージ</Label>
              <textarea
                id="cta.directorMessage"
                name="cta.directorMessage"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="診断結果ページに表示するメッセージを入力してください"
                value={settings.ctaConfig.directorMessage || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ボタン並び順設定 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">ボタンの並び順</h2>
          <p className="text-sm text-gray-500 mb-4">
            ドラッグ&ドロップでボタンの表示順序を変更できます
          </p>

          <div className="space-y-2">
            {ctaOrder.map((key, index) => (
              <div
                key={key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-move transition-colors ${
                  draggedIndex === index ? "bg-blue-100" : "hover:bg-gray-100"
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {CTA_BUTTON_NAMES[key] || key}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* カスタムCTA設定 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">カスタムCTAボタン</h2>
              <p className="text-sm text-gray-500">
                オリジナルのリンクボタンを追加できます
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addCustomCTA} className="gap-2">
              <Plus className="w-4 h-4" />
              追加
            </Button>
          </div>

          <div className="space-y-4">
            {settings.ctaConfig.customCTAs?.map((cta, index) => (
              <div key={cta.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    カスタムボタン {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomCTA(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>ボタンラベル</Label>
                  <Input
                    placeholder="例: 公式サイト"
                    value={cta.label}
                    onChange={(e) => updateCustomCTA(index, "label", e.target.value)}
                    className={validationErrors[`customCTA_${index}_label`] ? "border-red-500" : ""}
                  />
                  {validationErrors[`customCTA_${index}_label`] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors[`customCTA_${index}_label`]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>リンクURL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={cta.url}
                    onChange={(e) => updateCustomCTA(index, "url", e.target.value)}
                    className={validationErrors[`customCTA_${index}_url`] ? "border-red-500" : ""}
                  />
                  {validationErrors[`customCTA_${index}_url`] && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors[`customCTA_${index}_url`]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>ボタン色</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cta.color || settings.mainColor}
                      onChange={(e) => updateCustomCTA(index, "color", e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={cta.color || settings.mainColor}
                      onChange={(e) => updateCustomCTA(index, "color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!settings.ctaConfig.customCTAs || settings.ctaConfig.customCTAs.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <p>カスタムボタンはまだありません</p>
                <p className="text-sm">「追加」ボタンをクリックして作成してください</p>
              </div>
            )}
          </div>
        </div>

        {/* CTAプレビュー */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">CTAボタンプレビュー</h2>
              <p className="text-sm text-gray-500">
                診断結果ページに表示されるボタンのプレビュー
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "閉じる" : "プレビューを表示"}
            </Button>
          </div>

          {showPreview && (
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="max-w-md mx-auto space-y-4">
                {/* ロゴプレビュー */}
                {settings.logoUrl && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={settings.logoUrl}
                      alt="Logo preview"
                      className="h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* 医院名 */}
                <h3 className="text-xl font-bold text-center" style={{ color: settings.mainColor }}>
                  {settings.name || "医院名"}
                </h3>

                {/* CTAボタン */}
                <div className="space-y-3">
                  {settings.ctaConfig.phone && (
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                      style={{ backgroundColor: settings.mainColor }}
                    >
                      <Phone className="w-5 h-5" />
                      電話で予約
                    </button>
                  )}
                  {settings.ctaConfig.bookingUrl && (
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                      style={{ backgroundColor: settings.mainColor }}
                    >
                      <Calendar className="w-5 h-5" />
                      WEB予約
                    </button>
                  )}
                  {settings.ctaConfig.lineUrl && (
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 bg-[#06C755]"
                    >
                      <MessageCircle className="w-5 h-5" />
                      LINEで相談
                    </button>
                  )}
                  {settings.ctaConfig.googleMapsUrl && (
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-lg border-2 font-medium flex items-center justify-center gap-2"
                      style={{ borderColor: settings.mainColor, color: settings.mainColor }}
                    >
                      <MapPin className="w-5 h-5" />
                      アクセス
                    </button>
                  )}

                  {/* カスタムCTA */}
                  {settings.ctaConfig.customCTAs?.map((cta, index) => (
                    cta.label && cta.url && (
                      <button
                        key={index}
                        type="button"
                        className="w-full py-3 px-4 rounded-lg text-white font-medium"
                        style={{ backgroundColor: cta.color || settings.mainColor }}
                      >
                        {cta.label}
                      </button>
                    )
                  ))}
                </div>

                {/* 院長メッセージ */}
                {settings.ctaConfig.directorMessage && (
                  <div className="mt-4 p-4 bg-white rounded-lg border">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {settings.ctaConfig.directorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
