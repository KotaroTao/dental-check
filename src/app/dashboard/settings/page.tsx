"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    phone?: string;
    directorMessage?: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings>({
    name: "",
    logoUrl: "",
    mainColor: "#2563eb",
    ctaConfig: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setSettings({
            name: data.clinic.name || "",
            logoUrl: data.clinic.logoUrl || "",
            mainColor: data.clinic.mainColor || "#2563eb",
            ctaConfig: data.clinic.ctaConfig || {},
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/clinic/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
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
              />
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
              />
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
              />
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
              />
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
              />
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
              />
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
              />
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
              />
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

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
