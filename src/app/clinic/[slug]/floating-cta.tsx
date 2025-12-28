"use client";

import { useState, useEffect } from "react";
import { Phone, Calendar, MessageCircle, X } from "lucide-react";
import type { CTAConfig } from "@/types/clinic";

interface FloatingCTAProps {
  ctaConfig: CTAConfig;
  mainColor: string;
}

export function FloatingCTA({ ctaConfig, mainColor }: FloatingCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // スクロールで表示/非表示
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  const hasMultipleCTA = [
    ctaConfig.phone,
    ctaConfig.bookingUrl,
    ctaConfig.lineUrl,
  ].filter(Boolean).length > 1;

  // 単一CTAの場合は直接表示
  if (!hasMultipleCTA) {
    if (ctaConfig.phone) {
      return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <a
            href={`tel:${ctaConfig.phone}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-medium shadow-lg"
            style={{ backgroundColor: mainColor }}
          >
            <Phone className="w-5 h-5" />
            電話予約
          </a>
        </div>
      );
    }
    if (ctaConfig.bookingUrl) {
      return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <a
            href={ctaConfig.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-medium shadow-lg"
            style={{ backgroundColor: mainColor }}
          >
            <Calendar className="w-5 h-5" />
            WEB予約
          </a>
        </div>
      );
    }
    if (ctaConfig.lineUrl) {
      return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <a
            href={ctaConfig.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#06C755] text-white font-medium shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            LINEで予約
          </a>
        </div>
      );
    }
    return null;
  }

  // 複数CTAの場合は展開式
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      {isExpanded ? (
        <div className="bg-white rounded-xl shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-800">ご予約・お問い合わせ</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {ctaConfig.phone && (
            <a
              href={`tel:${ctaConfig.phone}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: mainColor }}
            >
              <Phone className="w-5 h-5" />
              電話予約
            </a>
          )}

          {ctaConfig.bookingUrl && (
            <a
              href={ctaConfig.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 font-medium"
              style={{ borderColor: mainColor, color: mainColor }}
            >
              <Calendar className="w-5 h-5" />
              WEB予約
            </a>
          )}

          {ctaConfig.lineUrl && (
            <a
              href={ctaConfig.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#06C755] text-white font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              LINEで予約
            </a>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-medium shadow-lg"
          style={{ backgroundColor: mainColor }}
        >
          <Calendar className="w-5 h-5" />
          ご予約はこちら
        </button>
      )}
    </div>
  );
}
