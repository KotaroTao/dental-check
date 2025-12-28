"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClinicPhoto } from "@/types/clinic";

interface PhotoCarouselProps {
  photos: ClinicPhoto[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // 1枚の場合はシンプル表示
  if (photos.length === 1) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <img
          src={photos[0].url}
          alt={photos[0].caption || "医院写真"}
          className="w-full h-64 object-cover"
        />
        {photos[0].caption && (
          <p className="p-3 text-sm text-gray-600 text-center">
            {photos[0].caption}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl overflow-hidden shadow-sm">
      {/* メイン画像 */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={photos[currentIndex].url}
          alt={photos[currentIndex].caption || `医院写真 ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* 左右ボタン */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all"
          aria-label="前の写真"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all"
          aria-label="次の写真"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>

        {/* インジケーター */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`写真 ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* キャプション */}
      {photos[currentIndex].caption && (
        <p className="p-3 text-sm text-gray-600 text-center">
          {photos[currentIndex].caption}
        </p>
      )}

      {/* サムネイル（4枚以上の場合） */}
      {photos.length >= 4 && (
        <div className="flex gap-1 p-2 border-t overflow-x-auto">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden transition-all ${
                index === currentIndex
                  ? "ring-2 ring-blue-500"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={photo.url}
                alt={photo.caption || `サムネイル ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
