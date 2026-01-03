"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Printer, Calendar, Phone, MessageCircle, Building2 } from "lucide-react";
import { motion } from "framer-motion";

// プレビュー用の固定データ（お口年齢診断、スコア100の場合）
const previewData = {
  diagnosisName: "お口年齢診断",
  diagnosisSlug: "oral-age",
  userAge: 35,
  totalScore: 100,
  resultPattern: {
    minScore: 86,
    maxScore: 100,
    category: "優秀",
    title: "素晴らしいケア",
    message: "素晴らしいお口のケアです！定期検診で維持していきましょう。",
    ageModifier: -5,
  },
  oralAge: 30, // 35 - 5 = 30歳
};

export default function PreviewResultPage() {
  const { diagnosisName, userAge, resultPattern, oralAge } = previewData;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden max-w-md mx-auto">
          <CardHeader className="text-center bg-gradient-to-b from-blue-50 to-white pb-8">
            <CardTitle className="text-lg text-gray-600 mb-4">
              {diagnosisName} 結果
            </CardTitle>

            <div className="space-y-2">
              <p className="text-gray-600">あなたのお口年齢は</p>
              <p className="text-5xl font-bold text-primary">{oralAge}歳</p>
              <p className="text-sm text-gray-500">
                （実年齢{userAge}歳より
                <span className="text-green-500">
                  {oralAge - userAge}歳
                </span>
                ）
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">アドバイス</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {resultPattern.message}
              </p>
            </div>

            {/* プレビュー用CTAエリア */}
            <PreviewCTA />

            {/* シェア・印刷ボタン */}
            <div className="flex justify-center gap-4 pt-4 border-t print:hidden">
              <Button variant="outline" className="gap-2" disabled>
                <Share2 className="w-4 h-4" />
                結果をシェア
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <Printer className="w-4 h-4" />
                印刷
              </Button>
            </div>

            {/* もう一度診断 */}
            <div className="text-center pt-2">
              <Button variant="ghost" disabled>
                別の診断を試す
              </Button>
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
    </main>
  );
}

// プレビュー用CTAコンポーネント（実際のCTAボタン表示のサンプル）
function PreviewCTA() {
  const mainColor = "#2563eb";

  return (
    <div className="space-y-4">
      {/* 院長メッセージ */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          診断結果をご覧いただきありがとうございます。定期的な検診で健康な歯を維持しましょう。
        </p>
        <p className="text-sm text-gray-500 mt-2 text-right">
          - サンプル歯科医院
        </p>
      </div>

      {/* CTAボタン */}
      <div className="space-y-3">
        {/* 予約ボタン */}
        <Button
          className="w-full gap-2 text-white"
          size="lg"
          style={{ backgroundColor: mainColor }}
          disabled
        >
          <Calendar className="w-5 h-5" />
          Web予約はこちら
        </Button>

        {/* 電話ボタン */}
        <div
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium border-2 opacity-70"
          style={{ borderColor: mainColor, color: mainColor }}
        >
          <Phone className="w-5 h-5" />
          電話で相談 (03-1234-5678)
        </div>

        {/* SNSボタン */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            style={{ borderColor: "#06C755", color: "#06C755" }}
            disabled
          >
            <MessageCircle className="w-4 h-4" />
            LINE
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            style={{ borderColor: "#E4405F", color: "#E4405F" }}
            disabled
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </Button>
        </div>

        {/* 医院ホームページへのリンク */}
        <div
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg font-medium text-white opacity-70"
          style={{ backgroundColor: mainColor }}
        >
          <Building2 className="w-5 h-5" />
          医院について詳しく見る
        </div>
      </div>
    </div>
  );
}
