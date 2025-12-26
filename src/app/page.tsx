import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* ヒーローセクション */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            DentalCheck
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            簡単な質問に答えるだけで、お口の健康状態をチェック。
            <br />
            歯科医院への来院を促す集患ツールです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/demo">
              <Button size="xl" className="w-full sm:w-auto">
                無料で診断を試す
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                医院として登録
              </Button>
            </Link>
          </div>
        </div>

        {/* 特徴セクション */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-bold text-lg mb-2">QRコードで簡単導入</h3>
            <p className="text-gray-600 text-sm">
              チラシやホームページにQRコードを設置するだけ。患者さんはスマホで簡単にアクセスできます。
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">✏️</span>
            </div>
            <h3 className="font-bold text-lg mb-2">結果画面をカスタマイズ</h3>
            <p className="text-gray-600 text-sm">
              予約ボタン、LINE、院長コメントなど、自由にカスタマイズ。来院につなげます。
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-bold text-lg mb-2">アクセス数を可視化</h3>
            <p className="text-gray-600 text-sm">
              QRコード読み取り数、診断完了数、CTAクリック数を確認できます。
            </p>
          </div>
        </div>

        {/* 料金セクション */}
        <div className="bg-white rounded-xl p-8 shadow-sm border text-center mb-16">
          <h2 className="text-2xl font-bold mb-4">シンプルな料金プラン</h2>
          <div className="text-5xl font-bold text-primary mb-2">
            ¥3,000<span className="text-lg font-normal text-gray-500">/月（税抜）</span>
          </div>
          <p className="text-gray-600 mb-6">14日間無料トライアル付き</p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              すべての診断コンテンツを利用可能
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              QRコード・埋め込みコード発行
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              結果画面のカスタマイズ
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              アクセス統計・分析機能
            </li>
          </ul>
        </div>

        {/* フッター */}
        <footer className="text-center text-gray-500 text-sm">
          <p>&copy; 2024 DentalCheck. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
