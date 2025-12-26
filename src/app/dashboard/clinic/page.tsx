"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClinicPage, ClinicPhoto } from "@/types/clinic";

interface ClinicData {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  logoUrl: string | null;
  mainColor: string;
  clinicPage: ClinicPage;
}

export default function ClinicPageEditor() {
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [clinicPage, setClinicPage] = useState<ClinicPage>({
    photos: [],
    director: {},
    hours: {},
    access: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const fetchClinicPage = async () => {
      try {
        const response = await fetch("/api/clinic/page");
        if (response.ok) {
          const data = await response.json();
          setClinic(data.clinic);
          setClinicPage({
            photos: data.clinic.clinicPage?.photos || [],
            director: data.clinic.clinicPage?.director || {},
            hours: data.clinic.clinicPage?.hours || {},
            access: data.clinic.clinicPage?.access || {},
          });
        }
      } catch (error) {
        console.error("Failed to fetch clinic page:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinicPage();
  }, []);

  const handleDirectorChange = (field: string, value: string) => {
    setClinicPage({
      ...clinicPage,
      director: { ...clinicPage.director, [field]: value },
    });
  };

  const handleHoursChange = (field: string, value: string) => {
    setClinicPage({
      ...clinicPage,
      hours: { ...clinicPage.hours, [field]: value },
    });
  };

  const handleAccessChange = (field: string, value: string) => {
    setClinicPage({
      ...clinicPage,
      access: { ...clinicPage.access, [field]: value },
    });
  };

  const handlePhotoChange = (index: number, field: keyof ClinicPhoto, value: string) => {
    const newPhotos = [...(clinicPage.photos || [])];
    newPhotos[index] = { ...newPhotos[index], [field]: value };
    setClinicPage({ ...clinicPage, photos: newPhotos });
  };

  const addPhoto = () => {
    setClinicPage({
      ...clinicPage,
      photos: [...(clinicPage.photos || []), { url: "", caption: "" }],
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...(clinicPage.photos || [])];
    newPhotos.splice(index, 1);
    setClinicPage({ ...clinicPage, photos: newPhotos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // 空のURLの写真を除外
    const filteredPhotos = (clinicPage.photos || []).filter(
      (photo) => photo.url.trim() !== ""
    );

    try {
      const response = await fetch("/api/clinic/page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicPage: {
            ...clinicPage,
            photos: filteredPhotos,
          },
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "医院紹介ページを保存しました" });
        setClinicPage({ ...clinicPage, photos: filteredPhotos });
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">医院紹介ページ</h1>
        {clinic && (
          <Link
            href={`/clinic/${clinic.slug}`}
            target="_blank"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            公開ページを見る →
          </Link>
        )}
      </div>

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

        {/* 医院写真 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">医院写真</h2>
          <p className="text-sm text-gray-500 mb-4">
            外観や院内の写真を追加できます（複数可）
          </p>

          <div className="space-y-4">
            {(clinicPage.photos || []).map((photo, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="画像URL"
                    value={photo.url}
                    onChange={(e) => handlePhotoChange(index, "url", e.target.value)}
                  />
                  <Input
                    placeholder="キャプション（例：外観、診察室）"
                    value={photo.caption || ""}
                    onChange={(e) => handlePhotoChange(index, "caption", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePhoto(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  削除
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPhoto}>
              + 写真を追加
            </Button>
          </div>
        </div>

        {/* 院長情報 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">院長情報</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="director.name">院長名</Label>
              <Input
                id="director.name"
                placeholder="山田 太郎"
                value={clinicPage.director?.name || ""}
                onChange={(e) => handleDirectorChange("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="director.photoUrl">院長写真URL</Label>
              <Input
                id="director.photoUrl"
                type="url"
                placeholder="https://example.com/director.jpg"
                value={clinicPage.director?.photoUrl || ""}
                onChange={(e) => handleDirectorChange("photoUrl", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="director.profile">院長プロフィール</Label>
              <textarea
                id="director.profile"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="〇〇大学歯学部卒業。〇〇年開業。専門は..."
                value={clinicPage.director?.profile || ""}
                onChange={(e) => handleDirectorChange("profile", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 診療時間 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">診療時間</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours.weekday">平日</Label>
              <Input
                id="hours.weekday"
                placeholder="9:00〜12:00 / 14:00〜18:00"
                value={clinicPage.hours?.weekday || ""}
                onChange={(e) => handleHoursChange("weekday", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours.saturday">土曜日</Label>
              <Input
                id="hours.saturday"
                placeholder="9:00〜13:00"
                value={clinicPage.hours?.saturday || ""}
                onChange={(e) => handleHoursChange("saturday", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours.sunday">日曜日</Label>
              <Input
                id="hours.sunday"
                placeholder="休診"
                value={clinicPage.hours?.sunday || ""}
                onChange={(e) => handleHoursChange("sunday", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours.holiday">祝日</Label>
              <Input
                id="hours.holiday"
                placeholder="休診"
                value={clinicPage.hours?.holiday || ""}
                onChange={(e) => handleHoursChange("holiday", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours.note">備考</Label>
              <Input
                id="hours.note"
                placeholder="最終受付は30分前まで"
                value={clinicPage.hours?.note || ""}
                onChange={(e) => handleHoursChange("note", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* アクセス情報 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">アクセス</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access.address">住所</Label>
              <Input
                id="access.address"
                placeholder="東京都〇〇区〇〇1-2-3"
                value={clinicPage.access?.address || ""}
                onChange={(e) => handleAccessChange("address", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access.note">アクセス方法</Label>
              <Input
                id="access.note"
                placeholder="〇〇駅徒歩5分"
                value={clinicPage.access?.note || ""}
                onChange={(e) => handleAccessChange("note", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access.mapEmbed">Googleマップ埋め込みコード</Label>
              <textarea
                id="access.mapEmbed"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder='<iframe src="https://www.google.com/maps/embed?..." ...></iframe>'
                value={clinicPage.access?.mapEmbed || ""}
                onChange={(e) => handleAccessChange("mapEmbed", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Googleマップで「共有」→「地図を埋め込む」からコードをコピーしてください
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </form>
    </div>
  );
}
