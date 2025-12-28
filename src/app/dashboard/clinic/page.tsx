"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Plus, Trash2, GripVertical, Bell, Upload, Loader2, Save } from "lucide-react";
import type { ClinicPage, ClinicPhoto, Treatment, Facility, Announcement, WeeklySchedule, DaySchedule } from "@/types/clinic";

interface ClinicData {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  logoUrl: string | null;
  mainColor: string;
  clinicPage: ClinicPage;
}

// 曜日ラベル
const DAY_LABELS = {
  mon: "月",
  tue: "火",
  wed: "水",
  thu: "木",
  fri: "金",
  sat: "土",
  sun: "日",
} as const;

// 診療内容のプリセット
const TREATMENT_PRESETS = [
  { name: "一般歯科", icon: "tooth" },
  { name: "小児歯科", icon: "child" },
  { name: "矯正歯科", icon: "braces" },
  { name: "審美歯科", icon: "sparkle" },
  { name: "インプラント", icon: "implant" },
  { name: "歯周病治療", icon: "gum" },
  { name: "予防歯科", icon: "shield" },
  { name: "ホワイトニング", icon: "whitening" },
  { name: "口腔外科", icon: "surgery" },
  { name: "入れ歯", icon: "denture" },
];

// 設備のプリセット
const FACILITY_PRESETS = [
  { name: "駐車場完備", icon: "car" },
  { name: "バリアフリー", icon: "wheelchair" },
  { name: "キッズスペース", icon: "child" },
  { name: "個室診療室", icon: "room" },
  { name: "CT完備", icon: "ct" },
  { name: "クレジットカード可", icon: "card" },
  { name: "土曜診療", icon: "calendar" },
  { name: "急患対応", icon: "emergency" },
  { name: "訪問診療", icon: "home" },
  { name: "英語対応", icon: "globe" },
];

export default function ClinicPageEditor() {
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [clinicPage, setClinicPage] = useState<ClinicPage>({
    photos: [],
    director: {},
    hours: {},
    weeklySchedule: {},
    access: {},
    treatments: [],
    facilities: [],
    announcements: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [useDetailedHours, setUseDetailedHours] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 画像圧縮関数
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      // 既に小さいファイルは圧縮しない
      if (file.size < 500 * 1024) {
        resolve(file);
        return;
      }

      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const blobUrl = URL.createObjectURL(file);

      img.onload = () => {
        // BlobURLをクリーンアップ
        URL.revokeObjectURL(blobUrl);

        let { width, height } = img;

        // 最大幅を超える場合はリサイズ
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
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("画像の読み込みに失敗しました"));
      };
      img.src = blobUrl;
    });
  };

  useEffect(() => {
    const fetchClinicPage = async () => {
      try {
        const response = await fetch("/api/clinic/page");
        if (response.ok) {
          const data = await response.json();
          setClinic(data.clinic);
          const page = data.clinic.clinicPage || {};
          setClinicPage({
            photos: page.photos || [],
            director: page.director || {},
            hours: page.hours || {},
            weeklySchedule: page.weeklySchedule || {},
            access: page.access || {},
            treatments: page.treatments || [],
            facilities: page.facilities || [],
            announcements: page.announcements || [],
          });
          // 曜日別診療時間が設定されている場合は詳細モードに
          if (page.weeklySchedule && Object.keys(page.weeklySchedule).length > 0) {
            setUseDetailedHours(true);
          }
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

  const handleWeeklyScheduleChange = (day: keyof Omit<WeeklySchedule, 'note'>, field: keyof DaySchedule, value: string | boolean) => {
    const currentSchedule = clinicPage.weeklySchedule || {};
    const currentDay = (currentSchedule[day] as DaySchedule) || {};
    setClinicPage({
      ...clinicPage,
      weeklySchedule: {
        ...currentSchedule,
        [day]: { ...currentDay, [field]: value },
      },
    });
  };

  const handleAccessChange = (field: string, value: string) => {
    setClinicPage({
      ...clinicPage,
      access: { ...clinicPage.access, [field]: value },
    });
  };

  const handlePhotoChange = (index: number, field: keyof ClinicPhoto, value: string) => {
    setClinicPage(prev => {
      const newPhotos = [...(prev.photos || [])];
      // indexが範囲外の場合は空のオブジェクトを作成
      if (!newPhotos[index]) {
        newPhotos[index] = { url: "", caption: "" };
      }
      newPhotos[index] = { ...newPhotos[index], [field]: value };
      return { ...prev, photos: newPhotos };
    });
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    // 即座にプレビュー表示（ローカルURL）
    const previewUrl = URL.createObjectURL(file);

    // プレビューを即座に設定
    setClinicPage(prev => {
      const newPhotos = [...(prev.photos || [])];
      if (!newPhotos[index]) {
        newPhotos[index] = { url: "", caption: "" };
      }
      newPhotos[index] = { ...newPhotos[index], url: previewUrl };
      return { ...prev, photos: newPhotos };
    });

    setUploadingIndex(index);
    try {
      // 画像を圧縮
      const compressedFile = await compressImage(file);

      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "アップロードに失敗しました");
      }

      const { url } = await response.json();
      // アップロード完了後、サーバーURLに置き換え
      URL.revokeObjectURL(previewUrl);
      handlePhotoChange(index, "url", url);
    } catch (error) {
      // エラー時はプレビューを削除
      URL.revokeObjectURL(previewUrl);
      handlePhotoChange(index, "url", "");
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "アップロードに失敗しました",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  // ドラッグ＆ドロップでファイルアップロード
  const handleFileDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handlePhotoUpload(index, file);
    }
  };

  // 写真の並び替え
  const reorderPhotos = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newPhotos = [...(clinicPage.photos || [])];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    setClinicPage({ ...clinicPage, photos: newPhotos });
  };

  const removePhoto = (index: number) => {
    if (!confirm("この写真を削除しますか？")) {
      return;
    }
    const newPhotos = [...(clinicPage.photos || [])];
    newPhotos.splice(index, 1);
    setClinicPage({ ...clinicPage, photos: newPhotos });
  };

  // 診療内容
  const addTreatment = (preset?: { name: string; icon: string }) => {
    const newTreatment: Treatment = preset || { name: "", icon: "" };
    setClinicPage({
      ...clinicPage,
      treatments: [...(clinicPage.treatments || []), newTreatment],
    });
  };

  const updateTreatment = (index: number, field: keyof Treatment, value: string) => {
    const newTreatments = [...(clinicPage.treatments || [])];
    newTreatments[index] = { ...newTreatments[index], [field]: value };
    setClinicPage({ ...clinicPage, treatments: newTreatments });
  };

  const removeTreatment = (index: number) => {
    const newTreatments = [...(clinicPage.treatments || [])];
    newTreatments.splice(index, 1);
    setClinicPage({ ...clinicPage, treatments: newTreatments });
  };

  // 設備・特徴
  const addFacility = (preset?: { name: string; icon: string }) => {
    const newFacility: Facility = preset || { name: "", icon: "" };
    setClinicPage({
      ...clinicPage,
      facilities: [...(clinicPage.facilities || []), newFacility],
    });
  };

  const removeFacility = (index: number) => {
    const newFacilities = [...(clinicPage.facilities || [])];
    newFacilities.splice(index, 1);
    setClinicPage({ ...clinicPage, facilities: newFacilities });
  };

  // お知らせ
  const addAnnouncement = () => {
    const newAnnouncement: Announcement = {
      id: crypto.randomUUID(),
      title: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
      important: false,
    };
    setClinicPage({
      ...clinicPage,
      announcements: [newAnnouncement, ...(clinicPage.announcements || [])],
    });
  };

  const updateAnnouncement = (index: number, field: keyof Announcement, value: string | boolean) => {
    const newAnnouncements = [...(clinicPage.announcements || [])];
    newAnnouncements[index] = { ...newAnnouncements[index], [field]: value };
    setClinicPage({ ...clinicPage, announcements: newAnnouncements });
  };

  const removeAnnouncement = (index: number) => {
    const newAnnouncements = [...(clinicPage.announcements || [])];
    newAnnouncements.splice(index, 1);
    setClinicPage({ ...clinicPage, announcements: newAnnouncements });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // 空のURLの写真を除外
    const filteredPhotos = (clinicPage.photos || []).filter(
      (photo) => photo.url.trim() !== ""
    );

    // 空の診療内容を除外
    const filteredTreatments = (clinicPage.treatments || []).filter(
      (t) => t.name.trim() !== ""
    );

    // 空の設備を除外
    const filteredFacilities = (clinicPage.facilities || []).filter(
      (f) => f.name.trim() !== ""
    );

    // 空のお知らせを除外
    const filteredAnnouncements = (clinicPage.announcements || []).filter(
      (a) => a.title.trim() !== ""
    );

    try {
      const response = await fetch("/api/clinic/page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicPage: {
            ...clinicPage,
            photos: filteredPhotos,
            treatments: filteredTreatments,
            facilities: filteredFacilities,
            announcements: filteredAnnouncements,
          },
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "医院紹介ページを保存しました" });
        setClinicPage({
          ...clinicPage,
          photos: filteredPhotos,
          treatments: filteredTreatments,
          facilities: filteredFacilities,
          announcements: filteredAnnouncements,
        });
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
    <div className="flex gap-6">
      {/* 編集フォーム */}
      <div className={`${showPreview ? "w-1/2" : "w-full max-w-2xl"}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">医院紹介ページ</h1>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showPreview ? "プレビューを閉じる" : "プレビュー"}
            </Button>
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

          {/* お知らせ */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                お知らせ
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addAnnouncement}>
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              休診日や臨時のお知らせを掲載できます
            </p>

            <div className="space-y-4">
              {(clinicPage.announcements || []).map((announcement, index) => (
                <div key={announcement.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={announcement.date}
                      onChange={(e) => updateAnnouncement(index, "date", e.target.value)}
                      className="w-40"
                    />
                    <Input
                      placeholder="タイトル"
                      value={announcement.title}
                      onChange={(e) => updateAnnouncement(index, "title", e.target.value)}
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={announcement.important || false}
                        onChange={(e) => updateAnnouncement(index, "important", e.target.checked)}
                        className="rounded"
                      />
                      重要
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAnnouncement(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <textarea
                    placeholder="詳細（任意）"
                    value={announcement.content || ""}
                    onChange={(e) => updateAnnouncement(index, "content", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  />
                </div>
              ))}
              {(clinicPage.announcements || []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  お知らせはありません
                </p>
              )}
            </div>
          </div>

          {/* 医院写真 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">医院写真</h2>
            <p className="text-sm text-gray-500 mb-4">
              外観や院内の写真を追加できます（複数可）
            </p>

            <div className="space-y-4">
              {(clinicPage.photos || []).map((photo, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragEnd={() => {
                    if (draggedIndex !== null && dragOverIndex !== null) {
                      reorderPhotos(draggedIndex, dragOverIndex);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  className={`border rounded-lg p-4 transition-all ${
                    draggedIndex === index
                      ? "opacity-50 bg-blue-50 border-blue-300"
                      : dragOverIndex === index
                      ? "bg-blue-50 border-blue-400 border-2"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* ドラッグハンドル & サムネイルエリア */}
                    <div className="relative w-32 h-32 shrink-0">
                      {photo.url ? (
                        <div
                          className="w-full h-full relative group"
                          onDrop={(e) => handleFileDrop(index, e)}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `写真 ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border bg-white"
                          />
                          {uploadingIndex === index && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                          )}
                          {/* ドラッグハンドルオーバーレイ */}
                          <div className="absolute top-1 left-1 bg-white/90 rounded p-1 cursor-grab active:cursor-grabbing shadow-sm">
                            <GripVertical className="w-4 h-4 text-gray-500" />
                          </div>
                        </div>
                      ) : (
                        <label
                          className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file && file.type.startsWith("image/")) {
                              handlePhotoUpload(index, file);
                            }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(index, file);
                            }}
                          />
                          {uploadingIndex === index ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500 text-center px-2">
                                クリックまたは<br />ドロップ
                              </span>
                            </>
                          )}
                        </label>
                      )}
                    </div>

                    {/* 入力エリア */}
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="画像URL（直接入力も可）"
                          value={photo.url}
                          onChange={(e) => handlePhotoChange(index, "url", e.target.value)}
                          className="flex-1 text-sm"
                        />
                        {photo.url && (
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(index, file);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingIndex === index}
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                                input?.click();
                              }}
                              className="shrink-0"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </label>
                        )}
                      </div>
                      <Input
                        placeholder="キャプション（例：外観、診察室、待合室）"
                        value={photo.caption || ""}
                        onChange={(e) => handlePhotoChange(index, "caption", e.target.value)}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                          #{index + 1} • ドラッグで順序変更
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 新規追加ボタン（ドラッグ＆ドロップ対応） */}
              <label
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                  const startIndex = (clinicPage.photos || []).length;
                  // 先に全てのスロットを追加
                  setClinicPage(prev => ({
                    ...prev,
                    photos: [
                      ...(prev.photos || []),
                      ...files.map(() => ({ url: "", caption: "" })),
                    ],
                  }));
                  // 各ファイルをアップロード
                  files.forEach((file, i) => {
                    setTimeout(() => handlePhotoUpload(startIndex + i, file), 50);
                  });
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const startIndex = (clinicPage.photos || []).length;
                    // 先に全てのスロットを追加
                    setClinicPage(prev => ({
                      ...prev,
                      photos: [
                        ...(prev.photos || []),
                        ...files.map(() => ({ url: "", caption: "" })),
                      ],
                    }));
                    // 各ファイルをアップロード
                    files.forEach((file, i) => {
                      setTimeout(() => handlePhotoUpload(startIndex + i, file), 50);
                    });
                    // inputをリセット
                    e.target.value = "";
                  }}
                />
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-gray-600 font-medium">写真を追加</span>
                <span className="text-xs text-gray-400 mt-1">クリックまたはドラッグ＆ドロップ（複数可）</span>
              </label>
            </div>
          </div>

          {/* 診療内容 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">診療内容</h2>
            <p className="text-sm text-gray-500 mb-4">
              対応可能な治療をクリックで追加できます
            </p>

            {/* プリセットボタン */}
            <div className="flex flex-wrap gap-2 mb-4">
              {TREATMENT_PRESETS.map((preset) => {
                const isAdded = (clinicPage.treatments || []).some(t => t.name === preset.name);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => !isAdded && addTreatment(preset)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      isAdded
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {/* 追加済み診療内容 */}
            <div className="space-y-3">
              {(clinicPage.treatments || []).map((treatment, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="診療内容名"
                    value={treatment.name}
                    onChange={(e) => updateTreatment(index, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="説明（任意）"
                    value={treatment.description || ""}
                    onChange={(e) => updateTreatment(index, "description", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTreatment(index)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addTreatment()}>
                <Plus className="w-4 h-4 mr-1" />
                カスタム追加
              </Button>
            </div>
          </div>

          {/* 設備・特徴 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4">設備・特徴</h2>
            <p className="text-sm text-gray-500 mb-4">
              医院の設備や特徴をクリックで追加できます
            </p>

            {/* プリセットボタン */}
            <div className="flex flex-wrap gap-2 mb-4">
              {FACILITY_PRESETS.map((preset) => {
                const isAdded = (clinicPage.facilities || []).some(f => f.name === preset.name);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => !isAdded && addFacility(preset)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      isAdded
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {/* 追加済み設備 */}
            <div className="flex flex-wrap gap-2">
              {(clinicPage.facilities || []).map((facility, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
                >
                  {facility.name}
                  <button
                    type="button"
                    onClick={() => removeFacility(index)}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">診療時間</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useDetailedHours}
                  onChange={(e) => setUseDetailedHours(e.target.checked)}
                  className="rounded"
                />
                曜日別に詳細設定
              </label>
            </div>

            {useDetailedHours ? (
              /* 曜日別診療時間テーブル */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left w-16">曜日</th>
                      <th className="py-2 px-2 text-left">午前</th>
                      <th className="py-2 px-2 text-left">午後</th>
                      <th className="py-2 px-2 text-center w-16">休診</th>
                      <th className="py-2 px-2 text-left w-24">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((day) => {
                      const schedule = clinicPage.weeklySchedule?.[day] || {};
                      return (
                        <tr key={day} className="border-b">
                          <td className="py-2 px-2 font-medium">{DAY_LABELS[day]}</td>
                          <td className="py-2 px-2">
                            <Input
                              placeholder="9:00-12:00"
                              value={schedule.morning || ""}
                              onChange={(e) => handleWeeklyScheduleChange(day, "morning", e.target.value)}
                              disabled={schedule.closed}
                              className="text-sm h-8"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              placeholder="14:00-18:00"
                              value={schedule.afternoon || ""}
                              onChange={(e) => handleWeeklyScheduleChange(day, "afternoon", e.target.value)}
                              disabled={schedule.closed}
                              className="text-sm h-8"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={schedule.closed || false}
                              onChange={(e) => handleWeeklyScheduleChange(day, "closed", e.target.checked)}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              placeholder="隔週"
                              value={schedule.note || ""}
                              onChange={(e) => handleWeeklyScheduleChange(day, "note", e.target.value)}
                              className="text-sm h-8"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="weeklyNote">全体備考</Label>
                  <Input
                    id="weeklyNote"
                    placeholder="最終受付は30分前まで"
                    value={clinicPage.weeklySchedule?.note || ""}
                    onChange={(e) => setClinicPage({
                      ...clinicPage,
                      weeklySchedule: { ...clinicPage.weeklySchedule, note: e.target.value },
                    })}
                  />
                </div>
              </div>
            ) : (
              /* 従来形式 */
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
            )}
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

      {/* プレビュー */}
      {showPreview && (
        <div className="w-1/2 sticky top-4 h-[calc(100vh-2rem)] overflow-auto">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm text-gray-500 border-b">
              プレビュー
            </div>
            <div className="p-4">
              <ClinicPreview clinic={clinic} clinicPage={clinicPage} />
            </div>
          </div>
        </div>
      )}

      {/* 固定保存ボタン */}
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
        <span className="font-medium">{isSaving ? "保存中..." : "保存する"}</span>
      </button>
    </div>
  );
}

// プレビューコンポーネント
function ClinicPreview({ clinic, clinicPage }: { clinic: ClinicData | null; clinicPage: ClinicPage }) {
  if (!clinic) return null;

  const mainColor = clinic.mainColor || "#3b82f6";
  const hasAnnouncements = (clinicPage.announcements || []).length > 0;
  const hasTreatments = (clinicPage.treatments || []).length > 0;
  const hasFacilities = (clinicPage.facilities || []).length > 0;

  return (
    <div className="text-sm">
      {/* ヘッダー */}
      <div className="text-white p-4 rounded-lg mb-4" style={{ backgroundColor: mainColor }}>
        <h1 className="text-lg font-bold text-center">{clinic.name}</h1>
      </div>

      {/* お知らせ */}
      {hasAnnouncements && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2 text-xs">お知らせ</h3>
          {clinicPage.announcements!.slice(0, 2).map((a) => (
            <div key={a.id} className={`text-xs ${a.important ? "text-red-600 font-medium" : "text-gray-600"}`}>
              <span className="text-gray-400 mr-2">{a.date}</span>
              {a.title}
            </div>
          ))}
        </div>
      )}

      {/* 診療内容 */}
      {hasTreatments && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2 text-xs">診療内容</h3>
          <div className="flex flex-wrap gap-1">
            {clinicPage.treatments!.map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 設備・特徴 */}
      {hasFacilities && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2 text-xs">設備・特徴</h3>
          <div className="flex flex-wrap gap-1">
            {clinicPage.facilities!.map((f, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 院長 */}
      {clinicPage.director?.name && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2 text-xs">院長</h3>
          <p className="font-medium text-xs">{clinicPage.director.name}</p>
          {clinicPage.director.profile && (
            <p className="text-gray-600 text-xs mt-1 line-clamp-2">{clinicPage.director.profile}</p>
          )}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs">
        ※実際の公開ページとはデザインが異なります
      </p>
    </div>
  );
}
