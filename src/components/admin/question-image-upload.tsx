"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

interface Props {
  imageUrl: string | null | undefined;
  onImageChange: (url: string | null) => void;
}

export function QuestionImageUpload({ imageUrl, onImageChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック（HEIC/HEIFはMIMEタイプが空の場合があるので拡張子でもチェック）
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
    const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
    if (!allowedTypes.includes(file.type) && !isHeic) {
      setError("JPEG/JPG、PNG、WebP、GIF、HEIC形式のみアップロードできます");
      return;
    }

    // ファイルサイズチェック (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("ファイルサイズは10MB以下にしてください");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "diagnoses");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "アップロードに失敗しました");
        return;
      }

      onImageChange(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "不明なエラー";
      setError(`アップロードに失敗しました: ${message}`);
    } finally {
      setIsUploading(false);
      // inputをリセット（同じファイルを再選択可能にする）
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onImageChange(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative inline-block">
          <div className="relative w-40 h-28 border rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={imageUrl}
              alt="設問画像"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-7 h-7 p-0 rounded-full"
            onClick={handleRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4" />
              画像を追加
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
