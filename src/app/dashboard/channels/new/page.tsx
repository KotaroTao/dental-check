"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, X, Image as ImageIcon } from "lucide-react";

interface DiagnosisType {
  slug: string;
  name: string;
  clinicId: string | null;
}

export default function NewChannelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    diagnosisTypeSlug: "",
  });
  const [diagnosisTypes, setDiagnosisTypes] = useState<DiagnosisType[]>([]);
  const [isLoadingDiagnoses, setIsLoadingDiagnoses] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 診断タイプを取得
  useEffect(() => {
    const fetchDiagnoses = async () => {
      try {
        const response = await fetch("/api/dashboard/diagnoses");
        if (response.ok) {
          const data = await response.json();
          setDiagnosisTypes(data.diagnoses);
        }
      } catch (error) {
        console.error("Failed to fetch diagnoses:", error);
      } finally {
        setIsLoadingDiagnoses(false);
      }
    };
    fetchDiagnoses();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 画像選択処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("画像サイズは5MB以下にしてください");
      return;
    }

    // 形式チェック
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }

    setImageFile(file);
    setError("");

    // プレビュー生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 画像削除
  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ドラッグ＆ドロップ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleImageSelect(fakeEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 画像アップロード
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("画像のアップロードに失敗しました");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("QRコード名を入力してください");
      return;
    }

    if (!formData.diagnosisTypeSlug) {
      setError("診断タイプを選択してください");
      return;
    }

    setIsLoading(true);

    try {
      // 画像があればアップロード
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "QRコードの作成に失敗しました");
        return;
      }

      // 作成したQRコードの詳細ページへ
      router.push(`/dashboard/channels/${data.channel.id}`);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 診断タイプをカテゴリ別にグループ化
  const defaultDiagnoses = diagnosisTypes.filter((d) => d.clinicId === null);
  const customDiagnoses = diagnosisTypes.filter((d) => d.clinicId !== null);

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
        <h1 className="text-xl font-bold mb-6">新しいQRコードを作成</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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
              disabled={isLoading || isLoadingDiagnoses}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {isLoadingDiagnoses ? "読み込み中..." : "選択してください"}
              </option>
              {defaultDiagnoses.length > 0 && (
                <optgroup label="デフォルト診断">
                  {defaultDiagnoses.map((type) => (
                    <option key={type.slug} value={type.slug}>
                      {type.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {customDiagnoses.length > 0 && (
                <optgroup label="オリジナル診断">
                  {customDiagnoses.map((type) => (
                    <option key={type.slug} value={type.slug}>
                      {type.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-gray-500">
              このQRコードで使用する診断を選択してください
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

          {/* 画像アップロード */}
          <div className="space-y-2">
            <Label>チラシや看板の写真（任意）</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                imagePreview ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="プレビュー"
                    className="max-h-48 rounded-lg mx-auto"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                  <div className="text-sm text-gray-600">
                    ドラッグ＆ドロップまたは
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:underline mx-1"
                    >
                      ファイルを選択
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    JPEG, PNG, WebP（最大5MB）
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">
              配布チラシのデザイン画像や、ポスター・看板の設置場所を登録しておくと、QRコードの管理がしやすくなります
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || isUploading} className="flex-1">
              {isLoading || isUploading ? "作成中..." : "QRコードを作成"}
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
