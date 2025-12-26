"use client";

import { motion } from "framer-motion";
import { useDiagnosisStore } from "@/lib/diagnosis-store";
import { DiagnosisType } from "@/data/diagnosis-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoCTA } from "./demo-cta";
import { Share2 } from "lucide-react";
import Link from "next/link";

interface Props {
  diagnosis: DiagnosisType;
  isDemo: boolean;
  clinicSlug?: string;
}

export function ResultCard({ diagnosis, isDemo }: Props) {
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
            <div className="bg-blue-50 rounded-lg p-4">
              {/* TODO: 医院カスタマイズCTA */}
              <p className="text-center text-gray-600">
                詳しくは歯科医院にご相談ください
              </p>
            </div>
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
