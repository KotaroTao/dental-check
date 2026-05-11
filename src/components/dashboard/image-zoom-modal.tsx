"use client";

// チラシ画像をクリックで拡大表示するモーダル
// チラシ一覧・チラシ編集・新規作成ページから共通利用。
//
// 使い方:
//   const [zoomUrl, setZoomUrl] = useState<string | null>(null);
//   <img onClick={() => setZoomUrl(url)} ... />
//   <ImageZoomModal url={zoomUrl} onClose={() => setZoomUrl(null)} />
//
// ESC キーで閉じる + 背景クリックで閉じる + 画像本体クリックは閉じない
import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageZoomModalProps {
  url: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomModal({ url, alt, onClose }: ImageZoomModalProps) {
  // ESC キーでも閉じられるように。開いている間だけ keydown を購読する。
  useEffect(() => {
    if (!url) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // モーダル表示中は背景スクロールを止める
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="チラシ画像プレビュー"
    >
      {/* 閉じるボタン（右上） */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg"
        aria-label="プレビューを閉じる"
      >
        <X className="w-5 h-5" />
      </button>
      {/* 画像本体（クリックは閉じない） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt || "拡大プレビュー"}
        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
