import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Check,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Award,
  HelpCircle,
  Wand2,
  Video,
} from "lucide-react";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">くるくる診断DX<span className="text-[0.5em]"> for Dental</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                機能
              </Link>
              <Link href="/#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                使い方
              </Link>
              <Link href="/pricing" className="text-sm text-gray-900 font-medium">
                料金
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  ログイン
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  無料で始める
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              PRICING
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              シンプルで分かりやすい料金プラン
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              医院様のニーズに合わせて4つのプランをご用意。
              <br />
              すべてのプランで14日間の無料トライアルをお試しいただけます。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>14日間無料</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>導入5分</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" />
                <span>解約いつでもOK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* スタータープラン */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 relative">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">スタータープラン</h3>
                <p className="text-gray-500 text-sm mb-4">お手軽に始めたい医院様向け</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg text-gray-500">¥</span>
                  <span className="text-5xl font-bold text-gray-900">4,980</span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">（税別）</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">QRコード<strong className="text-gray-900">2枚まで</strong>作成可能</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">すべての診断コンテンツを利用可能</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">診断結果の閲覧</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">基本的な分析機能</span>
                </li>
              </ul>

              <Link href="/signup">
                <Button variant="outline" size="lg" className="w-full">
                  14日間無料で試す
                </Button>
              </Link>
            </div>

            {/* スタンダードプラン（おすすめ） */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium shadow-lg">
                  <Star className="w-4 h-4" />
                  おすすめ
                </span>
              </div>

              <div className="text-center mb-8 pt-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">スタンダードプラン</h3>
                <p className="text-gray-500 text-sm mb-4">本格的に活用したい医院様向け</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg text-blue-500">¥</span>
                  <span className="text-5xl font-bold text-gradient-primary">8,800</span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">（税別）</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">QRコード<strong className="text-blue-600">無制限</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">すべての診断コンテンツを利用可能</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">診断結果の閲覧</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">詳細な分析機能</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-700">CSVエクスポート</span>
                </li>
              </ul>

              <Link href="/signup">
                <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 group">
                  14日間無料で試す
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            {/* カスタムプラン */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-orange-400 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-medium shadow-lg">
                  <Wand2 className="w-4 h-4" />
                  オリジナル診断
                </span>
              </div>

              <div className="text-center mb-8 pt-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">カスタムプラン</h3>
                <p className="text-gray-500 text-sm mb-4">オリジナル診断を作成したい医院様向け</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg text-orange-500">¥</span>
                  <span className="text-5xl font-bold text-orange-600">13,800</span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">（税別）</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-orange-600" />
                  </div>
                  <span className="text-gray-700">QRコード<strong className="text-orange-600">無制限</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-orange-600" />
                  </div>
                  <span className="text-gray-700">すべての診断コンテンツを利用可能</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-orange-600" />
                  </div>
                  <span className="text-gray-700">詳細な分析機能・CSVエクスポート</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Wand2 className="w-3 h-3 text-orange-600" />
                  </div>
                  <span className="text-gray-700"><strong className="text-orange-600">オリジナル診断作成</strong>（無制限）</span>
                </li>
              </ul>

              <Link href="/signup">
                <Button size="lg" className="w-full bg-orange-500 hover:bg-orange-600">
                  14日間無料で試す
                </Button>
              </Link>
            </div>

            {/* マネージドプラン */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-lg relative text-white">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">マネージドプラン</h3>
                <p className="text-gray-300 text-sm mb-4">カスタムプラン+専任サポート付き</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg text-blue-300">¥</span>
                  <span className="text-5xl font-bold">24,800</span>
                  <span className="text-gray-300">/月</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">（税別）</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-purple-300" />
                  </div>
                  <span className="text-gray-200">QRコード<strong className="text-white">無制限</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-purple-300" />
                  </div>
                  <span className="text-gray-200">詳細な分析機能・CSVエクスポート</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Wand2 className="w-3 h-3 text-orange-300" />
                  </div>
                  <span className="text-gray-200"><strong className="text-orange-300">オリジナル診断作成</strong>（無制限）</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-yellow-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-3 h-3 text-yellow-300" />
                  </div>
                  <span className="text-gray-200"><strong className="text-yellow-300">専任担当者</strong>によるサポートとアドバイス</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Video className="w-3 h-3 text-green-300" />
                  </div>
                  <span className="text-gray-200"><strong className="text-green-300">毎月30分</strong>の戦略ミーティング（Zoom）</span>
                </li>
              </ul>

              <Link href="/signup">
                <Button size="lg" variant="white" className="w-full">
                  14日間無料で試す
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            ※ 表示価格はすべて税別です。
          </p>
        </div>
      </section>

      {/* 比較表セクション */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
            プラン比較表
          </h2>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-600">機能</th>
                  <th className="p-4 font-medium text-gray-900 text-center">スターター</th>
                  <th className="p-4 font-medium text-blue-600 text-center bg-blue-50">スタンダード</th>
                  <th className="p-4 font-medium text-orange-600 text-center bg-orange-50">カスタム</th>
                  <th className="p-4 font-medium text-gray-900 text-center">マネージド</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">月額料金（税別）</td>
                  <td className="p-4 text-center font-medium">¥4,980</td>
                  <td className="p-4 text-center font-medium text-blue-600 bg-blue-50">¥8,800</td>
                  <td className="p-4 text-center font-medium text-orange-600 bg-orange-50">¥13,800</td>
                  <td className="p-4 text-center font-medium">¥24,800</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">QRコード作成数</td>
                  <td className="p-4 text-center">2枚まで</td>
                  <td className="p-4 text-center font-medium text-blue-600 bg-blue-50">無制限</td>
                  <td className="p-4 text-center font-medium text-orange-600 bg-orange-50">無制限</td>
                  <td className="p-4 text-center">無制限</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">診断コンテンツ</td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center bg-blue-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center bg-orange-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">結果画面カスタマイズ</td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center bg-blue-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center bg-orange-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">CSVエクスポート</td>
                  <td className="p-4 text-center text-gray-400">—</td>
                  <td className="p-4 text-center bg-blue-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center bg-orange-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">オリジナル診断作成</td>
                  <td className="p-4 text-center text-gray-400">—</td>
                  <td className="p-4 text-center text-gray-400 bg-blue-50">—</td>
                  <td className="p-4 text-center bg-orange-50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-4 text-gray-700">専任担当者サポート</td>
                  <td className="p-4 text-center text-gray-400">—</td>
                  <td className="p-4 text-center text-gray-400 bg-blue-50">—</td>
                  <td className="p-4 text-center text-gray-400 bg-orange-50">—</td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-gray-700">戦略ミーティング（Zoom）</td>
                  <td className="p-4 text-center text-gray-400">—</td>
                  <td className="p-4 text-center text-gray-400 bg-blue-50">—</td>
                  <td className="p-4 text-center text-gray-400 bg-orange-50">—</td>
                  <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQセクション */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
            よくあるご質問
          </h2>

          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">無料トライアル期間中に解約できますか？</h3>
                  <p className="text-gray-600">はい、14日間の無料トライアル期間中であれば、いつでも解約可能です。トライアル期間中は料金は発生しません。</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">プランの変更はできますか？</h3>
                  <p className="text-gray-600">はい、いつでもプランの変更が可能です。アップグレードは即時反映され、ダウングレードは次回更新日から適用されます。</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">支払い方法は何がありますか？</h3>
                  <p className="text-gray-600">クレジットカード（VISA、Mastercard、JCB、American Express）でのお支払いに対応しています。</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">複数の医院で利用できますか？</h3>
                  <p className="text-gray-600">1アカウントにつき1医院となります。複数医院での利用をご希望の場合は、医院ごとにアカウントをご登録ください。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              まずは14日間無料でお試しください
            </h2>
            <p className="text-blue-100 mb-8">
              クレジットカード不要で始められます。<br />
              トライアル期間中にいつでも解約可能です。
            </p>
            <Link href="/signup">
              <Button size="xl" variant="white" className="group">
                無料で始める
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 py-12 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">くるくる診断DX<span className="text-[0.5em]"> for Dental</span></span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              <Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">
                機能
              </Link>
              <Link href="/#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                使い方
              </Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                料金
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                利用規約
              </Link>
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                プライバシーポリシー
              </Link>
              <Link href="/legal" className="text-sm text-gray-400 hover:text-white transition-colors">
                特定商取引法に基づく表記
              </Link>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-500 text-sm">
                &copy; 2026 くるくる診断DX for Dental. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                運営: <a href="https://function-t.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">株式会社ファンクション・ティ</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
