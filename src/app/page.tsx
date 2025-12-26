import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* ヒーローセクション */}
        <div className="text-center space-y-6 mb-16">
          <p className="text-primary font-medium">歯科医院向け集患ツール</p>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            「ちょっと気になる」を
            <br />
            来院予約に変える。
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ポスティング、ホームページ、SNS広告——
            <br className="hidden sm:block" />
            QRコードを載せるだけで、診断コンテンツが新患を呼び込みます。
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

        {/* 課題提起セクション */}
        <div className="bg-gray-50 rounded-xl p-8 mb-16 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            チラシを配っても、予約が来ない...
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            「虫歯かも」「歯並びが気になる」——潜在患者は自覚がないと動きません。
            <br />
            診断コンテンツで<span className="font-bold text-primary">「自分の問題」として認識</span>させ、
            来院へのハードルを下げます。
          </p>
        </div>

        {/* 仕組みセクション */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">集患の流れ</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📄</span>
              </div>
              <div className="text-sm font-medium">QRコードを設置</div>
              <p className="text-xs text-gray-500 mt-1">チラシ・HP・SNS</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <div className="text-sm font-medium">患者さんが診断</div>
              <p className="text-xs text-gray-500 mt-1">スマホで2分</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💡</span>
              </div>
              <div className="text-sm font-medium">結果で気づく</div>
              <p className="text-xs text-gray-500 mt-1">「自分ごと」に</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏥</span>
              </div>
              <div className="text-sm font-medium">予約ボタンで来院</div>
              <p className="text-xs text-gray-500 mt-1">その場でアクション</p>
            </div>
          </div>
        </div>

        {/* 導入シーンセクション */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">こんな場所で使えます</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border flex gap-4">
              <div className="text-3xl">📄</div>
              <div>
                <h3 className="font-bold mb-1">ポスティングチラシ</h3>
                <p className="text-gray-600 text-sm">
                  QRコードを載せて配布。診断結果に予約ボタンを表示し、来院につなげます。
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border flex gap-4">
              <div className="text-3xl">🌐</div>
              <div>
                <h3 className="font-bold mb-1">ホームページ・ブログ</h3>
                <p className="text-gray-600 text-sm">
                  埋め込みコードを設置するだけ。サイト訪問者を予約につなげます。
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border flex gap-4">
              <div className="text-3xl">📱</div>
              <div>
                <h3 className="font-bold mb-1">SNS広告・Instagram</h3>
                <p className="text-gray-600 text-sm">
                  診断リンクを投稿。興味を持った人をそのまま来院予約へ。
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border flex gap-4">
              <div className="text-3xl">🚉</div>
              <div>
                <h3 className="font-bold mb-1">駅広告・看板</h3>
                <p className="text-gray-600 text-sm">
                  QRコードを大きく表示。通りすがりの人にもアプローチ。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 経路別計測セクション */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">どの施策が効果的？経路別に計測</h2>
            <p className="text-gray-600">
              チラシ、看板、SNS...それぞれ別のQRコードを発行して効果を比較できます
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="grid md:grid-cols-4 gap-4 text-center text-sm">
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="font-bold text-gray-800">ポスティング用</div>
                <div className="text-2xl font-bold text-primary mt-2">234</div>
                <div className="text-gray-500">診断完了</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="font-bold text-gray-800">駅看板用</div>
                <div className="text-2xl font-bold text-primary mt-2">89</div>
                <div className="text-gray-500">診断完了</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="font-bold text-gray-800">Instagram広告</div>
                <div className="text-2xl font-bold text-primary mt-2">156</div>
                <div className="text-gray-500">診断完了</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="font-bold text-gray-800">ホームページ</div>
                <div className="text-2xl font-bold text-primary mt-2">312</div>
                <div className="text-gray-500">診断完了</div>
              </div>
            </div>
            <p className="text-center text-gray-500 text-xs mt-4">※ダッシュボード画面のイメージです</p>
          </div>
        </div>

        {/* 特徴セクション */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-bold text-lg mb-2">導入は5分で完了</h3>
            <p className="text-gray-600 text-sm">
              登録してQRコードを発行するだけ。技術的な知識は不要です。
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">✏️</span>
            </div>
            <h3 className="font-bold text-lg mb-2">結果画面をカスタマイズ</h3>
            <p className="text-gray-600 text-sm">
              予約ボタン、LINE、院長コメントなど、自由に設定できます。
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-bold text-lg mb-2">経路別にQRコード発行</h3>
            <p className="text-gray-600 text-sm">
              チラシ用、看板用、SNS用など、施策ごとに別々のQRコードを作成。
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-bold text-lg mb-2">効果を比較・分析</h3>
            <p className="text-gray-600 text-sm">
              どの経路からの診断が多いか、予約につながったかを可視化。
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
              経路別QRコード発行（無制限）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              結果画面のカスタマイズ
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              経路別アクセス統計・効果比較
            </li>
          </ul>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="xl">14日間無料で試す</Button>
            </Link>
          </div>
        </div>

        {/* フッター */}
        <footer className="text-center text-gray-500 text-sm">
          <p>&copy; 2025 歯科集患ツール. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
