"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoCTA } from "./demo-cta";
import { Share2, Calendar, Phone, MessageCircle, Building2 } from "lucide-react";
import Link from "next/link";
import type { CTAConfig } from "@/types/clinic";

interface Props {
  diagnosis: DiagnosisType;
  isDemo: boolean;
  clinicSlug?: string;
  ctaConfig?: CTAConfig;
  clinicName?: string;
  mainColor?: string;
  channelId?: string;
}

export function ResultCard({ diagnosis, isDemo, clinicSlug, ctaConfig, clinicName, mainColor, channelId }: Props) {
  const { userAge, userGender, answers, totalScore, resultPattern, oralAge, reset } =
    useDiagnosisStore();
  const hasTrackedRef = useRef(false);

  // 診断完了をトラッキング（非デモモードのみ、1回だけ）
  useEffect(() => {
    if (isDemo || !channelId || !resultPattern || hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    fetch("/api/track/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        diagnosisType: diagnosis.slug,
        userAge,
        userGender,
        answers,
        totalScore,
        resultCategory: resultPattern.category,
      }),
    }).catch(() => {});
  }, [isDemo, channelId, diagnosis.slug, resultPattern, userAge, userGender, answers, totalScore]);

  if (!resultPattern) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "要注意":
      case "至急相談":
        return "text-red-600 bg-red-50 border-red-200";
      case "注意":
      case "早期相談":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "やや注意":
      case "相談推奨":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "良好":
      case "様子見":
        return "text-green-600 bg-green-50 border-green-200";
      case "優秀":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleShare = async () => {
    const text =
      diagnosis.slug === "oral-age"
        ? `お口年齢診断の結果：${oralAge}歳でした！`
        : `子供の矯正タイミングチェックの結果：${resultPattern.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: diagnosis.name,
          text,
          url: window.location.href,
        });
      } catch {
        // ユーザーがキャンセルした場合
      }
    } else {
      // コピー
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      alert("URLをコピーしました");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="text-center bg-gradient-to-b from-blue-50 to-white pb-8">
          <CardTitle className="text-lg text-gray-600 mb-4">
            {diagnosis.name} 結果
          </CardTitle>

          {diagnosis.slug === "oral-age" && oralAge !== null && (
            <div className="space-y-2">
              <p className="text-gray-600">あなたのお口年齢は</p>
              <p className="text-5xl font-bold text-primary">{oralAge}歳</p>
              {userAge && (
                <p className="text-sm text-gray-500">
                  （実年齢{userAge}歳より
                  {oralAge > userAge && (
                    <span className="text-red-500">
                      +{oralAge - userAge}歳
                    </span>
                  )}
                  {oralAge < userAge && (
                    <span className="text-green-500">
                      {oralAge - userAge}歳
                    </span>
                  )}
                  {oralAge === userAge && <span>同じ</span>}）
                </p>
              )}
            </div>
          )}

          {diagnosis.slug !== "oral-age" && (
            <div className="space-y-2">
              <p className="text-2xl font-bold text-primary">
                {resultPattern.title}
              </p>
            </div>
          )}

          <div
            className={`inline-block px-4 py-1 rounded-full text-sm font-medium border mt-4 ${getCategoryColor(
              resultPattern.category
            )}`}
          >
            {resultPattern.category}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">アドバイス</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {resultPattern.message}
            </p>
          </div>

          {/* CTA エリア */}
          {isDemo ? (
            <DemoCTA />
          ) : (
            <ClinicCTA
              ctaConfig={ctaConfig}
              clinicName={clinicName}
              clinicSlug={clinicSlug}
              mainColor={mainColor}
              channelId={channelId}
              diagnosisType={diagnosis.slug}
            />
          )}

          {/* シェアボタン */}
          <div className="flex justify-center gap-4 pt-4 border-t">
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              結果をシェア
            </Button>
          </div>

          {/* もう一度診断 */}
          {isDemo && (
            <div className="text-center pt-2">
              <Link href="/demo">
                <Button variant="ghost" onClick={reset}>
                  別の診断を試す
                </Button>
              </Link>
            </div>
          )}

          {/* 免責事項 */}
          <p className="text-xs text-center text-gray-400 pt-4 border-t">
            ※この診断は医療行為ではありません。
            <br />
            実際の診断・治療については、必ず歯科医師にご相談ください。
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 医院カスタマイズCTAコンポーネント
function ClinicCTA({
  ctaConfig,
  clinicName,
  clinicSlug,
  mainColor,
  channelId,
  diagnosisType,
}: {
  ctaConfig?: CTAConfig;
  clinicName?: string;
  clinicSlug?: string;
  mainColor?: string;
  channelId?: string;
  diagnosisType?: string;
}) {
  const buttonStyle = mainColor
    ? { backgroundColor: mainColor, borderColor: mainColor }
    : {};

  const trackClick = (ctaType: string) => {
    if (!channelId) return;
    fetch("/api/track/cta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, ctaType, diagnosisType }),
    }).catch(() => {});
  };

  const hasAnyCTA =
    ctaConfig?.bookingUrl ||
    ctaConfig?.lineUrl ||
    ctaConfig?.instagramUrl ||
    ctaConfig?.youtubeUrl ||
    ctaConfig?.facebookUrl ||
    ctaConfig?.tiktokUrl ||
    ctaConfig?.phone;

  if (!hasAnyCTA) {
    return (
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-center text-gray-600">
          詳しくは{clinicName || "歯科医院"}にご相談ください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 院長メッセージ */}
      {ctaConfig?.directorMessage && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {ctaConfig.directorMessage}
          </p>
          {clinicName && (
            <p className="text-sm text-gray-500 mt-2 text-right">
              - {clinicName}
            </p>
          )}
        </div>
      )}

      {/* CTAボタン */}
      <div className="space-y-3">
        {/* 予約ボタン */}
        {ctaConfig?.bookingUrl && (
          <a
            href={ctaConfig.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            onClick={() => trackClick("booking")}
          >
            <Button
              className="w-full gap-2 text-white"
              size="lg"
              style={buttonStyle}
            >
              <Calendar className="w-5 h-5" />
              Web予約はこちら
            </Button>
          </a>
        )}

        {/* 電話ボタン */}
        {ctaConfig?.phone && (
          <a
            href={`tel:${ctaConfig.phone.replace(/-/g, "")}`}
            className="block"
            onClick={() => trackClick("phone")}
          >
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              style={mainColor ? { borderColor: mainColor, color: mainColor } : {}}
            >
              <Phone className="w-5 h-5" />
              電話で相談 ({ctaConfig.phone})
            </Button>
          </a>
        )}

        {/* SNSボタン */}
        <div className="grid grid-cols-2 gap-3">
          {ctaConfig?.lineUrl && (
            <a
              href={ctaConfig.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("line")}
            >
              <Button
                variant="outline"
                className="w-full gap-2"
                style={{ borderColor: "#06C755", color: "#06C755" }}
              >
                <MessageCircle className="w-4 h-4" />
                LINE
              </Button>
            </a>
          )}
          {ctaConfig?.instagramUrl && (
            <a
              href={ctaConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("instagram")}
            >
              <Button
                variant="outline"
                className="w-full gap-2"
                style={{ borderColor: "#E4405F", color: "#E4405F" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </Button>
            </a>
          )}
          {ctaConfig?.youtubeUrl && (
            <a
              href={ctaConfig.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("youtube")}
            >
              <Button
                variant="outline"
                className="w-full gap-2"
                style={{ borderColor: "#FF0000", color: "#FF0000" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </Button>
            </a>
          )}
          {ctaConfig?.facebookUrl && (
            <a
              href={ctaConfig.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("facebook")}
            >
              <Button
                variant="outline"
                className="w-full gap-2"
                style={{ borderColor: "#1877F2", color: "#1877F2" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </a>
          )}
          {ctaConfig?.tiktokUrl && (
            <a
              href={ctaConfig.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("tiktok")}
            >
              <Button
                variant="outline"
                className="w-full gap-2"
                style={{ borderColor: "#000000", color: "#000000" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
                TikTok
              </Button>
            </a>
          )}
        </div>

        {/* 医院紹介ページへのリンク */}
        {clinicSlug && (
          <Link
            href={`/clinic/${clinicSlug}`}
            className="block"
            onClick={() => trackClick("clinic_page")}
          >
            <Button
              variant="ghost"
              className="w-full gap-2 text-gray-600"
            >
              <Building2 className="w-4 h-4" />
              医院について詳しく見る
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
