"use client";

import { useState, useEffect } from "react";
import { Phone, Calendar, MessageCircle, X, Instagram } from "lucide-react";
import type { CTAConfig } from "@/types/clinic";

interface FloatingCTAProps {
  ctaConfig: CTAConfig;
  mainColor: string;
  clinicId?: string;
}

export function FloatingCTA({ ctaConfig, mainColor, clinicId }: FloatingCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const trackClick = (ctaType: string) => {
    if (!clinicId) return;
    fetch("/api/track/clinic-cta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId, ctaType }),
    }).catch(() => {});
  };

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
    ctaConfig.instagramUrl,
    ctaConfig.youtubeUrl,
    ctaConfig.facebookUrl,
    ctaConfig.tiktokUrl,
    ctaConfig.threadsUrl,
  ].filter(Boolean).length > 1;

  // 単一CTAの場合は直接表示
  if (!hasMultipleCTA) {
    if (ctaConfig.phone) {
      return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <a
            href={`tel:${ctaConfig.phone}`}
            onClick={() => trackClick("phone")}
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
            onClick={() => trackClick("booking")}
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
            onClick={() => trackClick("line")}
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
        <div className="bg-white rounded-xl shadow-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto">
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
              onClick={() => trackClick("phone")}
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
              onClick={() => trackClick("booking")}
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
              onClick={() => trackClick("line")}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#06C755] text-white font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              LINEで予約
            </a>
          )}

          {ctaConfig.instagramUrl && (
            <a
              href={ctaConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("instagram")}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-medium"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>
          )}

          {/* SNSボタン（グリッド表示） */}
          {(ctaConfig.youtubeUrl || ctaConfig.facebookUrl || ctaConfig.tiktokUrl || ctaConfig.threadsUrl) && (
            <div className="grid grid-cols-2 gap-2">
              {ctaConfig.youtubeUrl && (
                <a
                  href={ctaConfig.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("youtube")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-medium text-sm"
                  style={{ borderColor: "#FF0000", color: "#FF0000" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </a>
              )}
              {ctaConfig.facebookUrl && (
                <a
                  href={ctaConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("facebook")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-medium text-sm"
                  style={{ borderColor: "#1877F2", color: "#1877F2" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
              )}
              {ctaConfig.tiktokUrl && (
                <a
                  href={ctaConfig.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("tiktok")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-medium text-sm"
                  style={{ borderColor: "#000000", color: "#000000" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  TikTok
                </a>
              )}
              {ctaConfig.threadsUrl && (
                <a
                  href={ctaConfig.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("threads")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-medium text-sm"
                  style={{ borderColor: "#000000", color: "#000000" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.243 1.33-3.023.88-.744 2.121-1.158 3.476-1.155l-.001.002c.453.003.876.033 1.27.085a8.594 8.594 0 0 0-.016-1.846c-.078-.927-.307-2.016-1.078-2.942-.894-1.074-2.357-1.62-4.349-1.62-.953 0-1.763.157-2.408.467-.649.312-1.127.707-1.42 1.176-.49.784-.627 1.676-.685 2.249l-2.032-.264c.083-.79.292-1.856.864-2.77.438-.7 1.098-1.29 1.962-1.757.96-.52 2.14-.78 3.505-.78h.016c2.502 0 4.443.724 5.77 2.153.983 1.058 1.475 2.363 1.574 3.644.038.495.033.964 0 1.406.376.182.72.39 1.03.628.887.684 1.514 1.548 1.867 2.57.46 1.332.457 2.86-.008 4.298-.55 1.703-1.659 3.089-3.209 4.012-1.478.88-3.327 1.343-5.503 1.377h-.014l.001.001zM10.075 13.479c-.882.018-1.614.247-2.12.665-.524.433-.764.972-.733 1.648.034.74.396 1.31 1.046 1.65.59.31 1.403.453 2.264.398 1.089-.058 1.9-.455 2.41-1.181.475-.673.715-1.607.715-2.775 0-.093 0-.186-.003-.28a8.829 8.829 0 0 0-1.422-.125h-.004c-.718 0-1.434.059-2.154 0h.001z"/>
                  </svg>
                  Threads
                </a>
              )}
            </div>
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
