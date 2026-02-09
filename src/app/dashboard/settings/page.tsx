"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, AlertCircle, Eye, Loader2, Save, ExternalLink, Smartphone } from "lucide-react";
import type { CustomCTA } from "@/types/clinic";
import { useDemoGuard } from "@/components/dashboard/demo-guard";

interface SubscriptionInfo {
  isDemo?: boolean;
}

// URL検証関数（絶対URLと相対URLを許可）
function isValidUrl(url: string): boolean {
  if (!url) return true; // 空は許可

  // 相対URLを許可（/で始まるパス）
  if (url.startsWith("/")) {
    // 不正なパスを除外
    return !url.includes("..") && /^\/[\w\-\.\/]*$/.test(url);
  }

  // 絶対URLの検証
  try {
    const parsed = new URL(url);
    // http/httpsのみ許可
    return parsed.protocol === "http:" || parsed.protocol === "https:";
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
    clinicHomepageUrl?: string;
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
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const { DemoModal, showDemoModal } = useDemoGuard();

  const isDemo = subscription?.isDemo ?? false;

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
      "bookingUrl", "lineUrl", "googleMapsUrl", "clinicHomepageUrl", "instagramUrl",
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

    fetchSettings();
    fetchSubscription();
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
        // レイアウトのヘッダーに医院名変更を通知
        window.dispatchEvent(new CustomEvent("clinic-settings-updated"));
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

      {/* デモアカウントバナー */}
      {isDemo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">デモアカウント - 閲覧専用</h3>
            <p className="text-sm text-blue-700 mt-1">
              デモアカウントでは設定の変更はできません。正式なアカウントでご登録いただくと、すべての機能をご利用いただけます。
            </p>
          </div>
        </div>
      )}

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
                disabled={isDemo}
                className={isDemo ? "bg-gray-50 cursor-not-allowed" : ""}
              />
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
                  disabled={isDemo}
                  className={`w-12 h-10 rounded border ${isDemo ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                />
                <Input
                  name="mainColor"
                  value={settings.mainColor}
                  onChange={handleChange}
                  disabled={isDemo}
                  className={`flex-1 ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
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
                disabled={isDemo}
                className={`${validationErrors.bookingUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.bookingUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.bookingUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.clinicHomepageUrl">医院ホームページ</Label>
              <Input
                id="cta.clinicHomepageUrl"
                name="cta.clinicHomepageUrl"
                type="url"
                placeholder="https://example-dental.com"
                value={settings.ctaConfig.clinicHomepageUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.clinicHomepageUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.clinicHomepageUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.clinicHomepageUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.phone">医院電話番号</Label>
              <Input
                id="cta.phone"
                name="cta.phone"
                type="tel"
                placeholder="03-1234-5678"
                value={settings.ctaConfig.phone || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.phone ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.lineUrl">LINE公式アカウント</Label>
              <Input
                id="cta.lineUrl"
                name="cta.lineUrl"
                type="url"
                placeholder="https://line.me/R/ti/p/@xxx"
                value={settings.ctaConfig.lineUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.lineUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.lineUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.lineUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.googleMapsUrl">Googleマップ</Label>
              <Input
                id="cta.googleMapsUrl"
                name="cta.googleMapsUrl"
                type="url"
                placeholder="https://maps.google.com/..."
                value={settings.ctaConfig.googleMapsUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.googleMapsUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.googleMapsUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.googleMapsUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.instagramUrl">Instagram</Label>
              <Input
                id="cta.instagramUrl"
                name="cta.instagramUrl"
                type="url"
                placeholder="https://instagram.com/xxx"
                value={settings.ctaConfig.instagramUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.instagramUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.instagramUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.instagramUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.youtubeUrl">YouTubeチャンネル</Label>
              <Input
                id="cta.youtubeUrl"
                name="cta.youtubeUrl"
                type="url"
                placeholder="https://youtube.com/@xxx"
                value={settings.ctaConfig.youtubeUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.youtubeUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.youtubeUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.youtubeUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.facebookUrl">Facebookページ</Label>
              <Input
                id="cta.facebookUrl"
                name="cta.facebookUrl"
                type="url"
                placeholder="https://facebook.com/xxx"
                value={settings.ctaConfig.facebookUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.facebookUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.facebookUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.facebookUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.tiktokUrl">TikTok</Label>
              <Input
                id="cta.tiktokUrl"
                name="cta.tiktokUrl"
                type="url"
                placeholder="https://tiktok.com/@xxx"
                value={settings.ctaConfig.tiktokUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.tiktokUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.tiktokUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.tiktokUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.threadsUrl">Threads</Label>
              <Input
                id="cta.threadsUrl"
                name="cta.threadsUrl"
                type="url"
                placeholder="https://threads.net/@xxx"
                value={settings.ctaConfig.threadsUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.threadsUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.threadsUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.threadsUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.xUrl">X（Twitter）</Label>
              <Input
                id="cta.xUrl"
                name="cta.xUrl"
                type="url"
                placeholder="https://x.com/xxx"
                value={settings.ctaConfig.xUrl || ""}
                onChange={handleChange}
                disabled={isDemo}
                className={`${validationErrors.xUrl ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {validationErrors.xUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.xUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta.directorMessage">院長からのメッセージ</Label>
              <textarea
                id="cta.directorMessage"
                name="cta.directorMessage"
                className={`flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
                placeholder="診断結果ページに表示するメッセージを入力してください"
                value={settings.ctaConfig.directorMessage || ""}
                onChange={handleChange}
                disabled={isDemo}
              />
            </div>
          </div>
        </div>

        {/* ボタン並び順設定 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">ボタンの並び順</h2>
          <p className="text-sm text-gray-500 mb-4">
            {isDemo ? "デモアカウントでは並び順の変更はできません" : "ドラッグ&ドロップでボタンの表示順序を変更できます"}
          </p>

          <div className="space-y-2">
            {ctaOrder.map((key, index) => (
              <div
                key={key}
                draggable={!isDemo}
                onDragStart={() => !isDemo && handleDragStart(index)}
                onDragOver={(e) => !isDemo && handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-colors ${
                  isDemo ? "cursor-not-allowed opacity-70" : "cursor-move"
                } ${draggedIndex === index ? "bg-blue-100" : isDemo ? "" : "hover:bg-gray-100"}`}
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
                {isDemo ? "デモアカウントでは追加・編集できません" : "オリジナルのリンクボタンを追加できます"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isDemo) {
                  showDemoModal();
                } else {
                  addCustomCTA();
                }
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              追加
            </Button>
          </div>

          <div className="space-y-4">
            {settings.ctaConfig.customCTAs?.map((cta, index) => (
              <div key={cta.id} className={`p-4 border rounded-lg bg-gray-50 space-y-3 ${isDemo ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    カスタムボタン {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isDemo) {
                        showDemoModal();
                      } else {
                        removeCustomCTA(index);
                      }
                    }}
                    className={isDemo ? "text-gray-400" : "text-red-500 hover:text-red-700 hover:bg-red-50"}
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
                    disabled={isDemo}
                    className={`${validationErrors[`customCTA_${index}_label`] ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
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
                    disabled={isDemo}
                    className={`${validationErrors[`customCTA_${index}_url`] ? "border-red-500" : ""} ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
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
                      disabled={isDemo}
                      className={`w-12 h-10 rounded border ${isDemo ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    />
                    <Input
                      value={cta.color || settings.mainColor}
                      onChange={(e) => updateCustomCTA(index, "color", e.target.value)}
                      disabled={isDemo}
                      className={`flex-1 ${isDemo ? "bg-gray-50 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!settings.ctaConfig.customCTAs || settings.ctaConfig.customCTAs.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <p>カスタムボタンはまだありません</p>
                <p className="text-sm">{isDemo ? "デモアカウントでは追加できません" : "「追加」ボタンをクリックして作成してください"}</p>
              </div>
            )}
          </div>
        </div>

        {/* 診断結果プレビュー */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">診断結果プレビュー</h2>
              <p className="text-sm text-gray-500">
                実際の診断結果ページを確認できます
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {showPreview ? "閉じる" : "プレビュー"}
              </Button>
              <a
                href="/preview/result"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button type="button" variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  新しいタブで開く
                </Button>
              </a>
            </div>
          </div>

          {showPreview && (
            <div className="border rounded-lg bg-gray-100 overflow-hidden">
              {/* モバイルフレーム風のプレビュー */}
              <div className="flex justify-center py-6">
                <div className="relative">
                  {/* スマホフレーム */}
                  <div className="w-[375px] h-[700px] bg-white rounded-[40px] shadow-xl border-4 border-gray-800 overflow-hidden">
                    {/* ノッチ */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10" />
                    {/* iframe */}
                    <iframe
                      src="/preview/result"
                      className="w-full h-full border-0"
                      title="診断結果プレビュー"
                    />
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 pb-4">
                ※ 設定変更を反映するには、保存後にページを再読み込みしてください
              </p>
            </div>
          )}
        </div>

        {!isDemo && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "設定を保存"}
            </Button>
          </div>
        )}
      </form>

      {/* 固定保存ボタン */}
      {!isDemo && (
        <button
          type="button"
          onClick={() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          disabled={isSaving}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-50"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span className="font-medium">{isSaving ? "保存中..." : "設定を保存"}</span>
        </button>
      )}

      {/* D5: デモアカウント制限モーダル（共通コンポーネント） */}
      <DemoModal />
    </div>
  );
}
