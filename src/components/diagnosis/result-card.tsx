"use client";

import { motion } from "framer-motion";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoCTA } from "./demo-cta";
import { Share2, Calendar, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { CTAConfig } from "@/types/clinic";

interface Props {
  diagnosis: DiagnosisType;
  isDemo: boolean;
  ctaConfig?: CTAConfig;
  clinicName?: string;
  mainColor?: string;
  channelId?: string;
}

export function ResultCard({ diagnosis, isDemo, ctaConfig, clinicName, mainColor, channelId }: Props) {
  const { userAge, resultPattern, oralAge, reset } =
    useDiagnosisStore();

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
          <div className="text-center pt-2">
            <Link href="/demo">
              <Button variant="ghost" onClick={reset}>
                別の診断を試す
              </Button>
            </Link>
          </div>

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
  mainColor,
  channelId,
  diagnosisType,
}: {
  ctaConfig?: CTAConfig;
  clinicName?: string;
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
        <div className="flex gap-3">
          {ctaConfig?.lineUrl && (
            <a
              href={ctaConfig.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
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
              className="flex-1"
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
        </div>
      </div>
    </div>
  );
}
