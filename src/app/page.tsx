import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  QrCode,
  Smartphone,
  LightbulbIcon,
  Building2,
  Zap,
  Palette,
  Target,
  BarChart3,
  ArrowRight,
  FileText,
  Globe,
  Instagram,
  MapPin,
  Play,
  TrendingUp,
  Shield,
  Clock,
  Award,
  CheckCircle2,
  HeartPulse,
  Users,
  MousePointerClick,
  PieChart,
  Settings,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                機能
              </a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                使い方
              </a>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 bg-mesh-gradient">
        {/* 装飾要素 */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow animation-delay-500" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-100/40 to-transparent rounded-full" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* バッジ */}
            <div className="animate-fade-in-down inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-full px-4 py-2 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-sm text-gray-700">歯科医院専用の集患ツール</span>
            </div>

            {/* メインタイトル */}
            <h1 className="animate-fade-in-up text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.3em] mb-6">
              <span className="inline-block">「ちょっと気になる」を</span>
              <br />
              <span className="inline-block mt-[0.4em] text-gradient-primary">来院予約に変える。</span>
            </h1>

            {/* サブタイトル */}
            <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              ポスティング、ホームページ、SNS広告——
              <br className="hidden sm:block" />
              <span className="font-medium text-gray-800">QRコードを載せるだけ</span>で、診断コンテンツが新患を呼び込みます。
            </p>

            {/* CTAボタン */}
            <div className="animate-fade-in-up animation-delay-300 flex justify-center mb-12">
              <Link href="/demo">
                <Button size="2xl" variant="outline" className="w-full sm:w-auto border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition-all duration-300 hover:scale-105 group">
                  <Play className="w-6 h-6 mr-2" />
                  無料で診断を試す
                  <ArrowRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            {/* 信頼バッジ */}
            <div className="animate-fade-in-up animation-delay-400 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
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

      {/* どんなことができるの？セクション */}
      <section id="what-can-do" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              WHAT WE OFFER
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              どんなことができるの？
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              QRくるくる診断DXは、QRコードを活用した診断コンテンツで
              <br className="hidden sm:block" />
              歯科医院の集患をサポートする便利なツールです
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* 主な機能カード */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* 機能1: 診断コンテンツ作成 */}
              <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-2">
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <HeartPulse className="w-24 h-24 text-blue-600" />
                </div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <HeartPulse className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-3">お口の健康診断コンテンツ</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    「お口年齢診断」や「矯正タイミングチェック」など、患者さんが気軽に試せる診断を提供。
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      約2分で完了するカンタン診断
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      スマホで手軽にアクセス
                    </li>
                  </ul>
                </div>
              </div>

              {/* 機能2: QRコード発行 */}
              <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-100 hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 hover:-translate-y-2">
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <QrCode className="w-24 h-24 text-green-600" />
                </div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-3">経路別QRコード発行</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    チラシ・看板・SNS広告など、設置場所ごとに別々のQRコードを発行できます。
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      何個でも無制限に作成
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      自由なタグ名で管理
                    </li>
                  </ul>
                </div>
              </div>

              {/* 機能3: 効果計測 */}
              <div className="group relative bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-8 border border-purple-100 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-2">
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <PieChart className="w-24 h-24 text-purple-600" />
                </div>
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <PieChart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-3">広告効果をデータで可視化</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    どの経路からの診断が多いか、どこから予約につながったかを一目で把握。
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      経路別のアクセス数を表示
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      効果の高い施策がわかる
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 歯科医院にとってのメリット */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
              {/* 装飾 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
                  歯科医院にとってのメリット
                </h3>
                <p className="text-gray-400 text-center max-w-xl mx-auto mb-10">
                  QRくるくる診断DXを導入することで、こんな効果が期待できます
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* メリット1 */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-2">潜在患者を獲得</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      「歯医者に行くほどではない」と思っている人にも診断で気づきを与え、来院のきっかけを作ります。
                    </p>
                  </div>

                  {/* メリット2 */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                      <MousePointerClick className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-2">予約へ直接誘導</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      診断結果画面に予約ボタンを表示。興味を持ったその瞬間に行動につなげます。
                    </p>
                  </div>

                  {/* メリット3 */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-2">広告費を最適化</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      どの広告が効果的かデータでわかるので、無駄な広告費を削減できます。
                    </p>
                  </div>

                  {/* メリット4 */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white mb-2">手間なく簡単導入</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      技術的な知識は一切不要。登録後すぐにQRコードを発行して使い始められます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 課題提起セクション */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
              {/* 装飾 */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-100 rounded-full opacity-50" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full opacity-50" />

              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
                  <span className="text-3xl">😔</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  チラシを配っても、予約が来ない...
                </h2>
                <p className="text-gray-600 max-w-xl mx-auto text-lg leading-relaxed">
                  「虫歯かも」「歯並びが気になる」——<br />
                  潜在患者は<span className="font-bold text-red-500">自覚がないと動きません</span>。
                </p>
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <p className="text-gray-700">
                    診断コンテンツで
                    <span className="inline-flex items-center mx-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                      <LightbulbIcon className="w-4 h-4 mr-1" />
                      「自分の問題」として認識
                    </span>
                    させ、
                    <br className="hidden sm:block" />
                    来院へのハードルを下げます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 仕組みセクション */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              シンプルな集患の流れ
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              4つのステップで、潜在患者を来院につなげます
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* コネクターライン（デスクトップ） */}
              <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-green-200 via-yellow-200 to-purple-200" />

              {/* Step 1 */}
              <div className="relative group">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <QrCode className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute top-0 -left-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    1
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">QRコードを設置</h3>
                  <p className="text-gray-500 text-sm">チラシ・HP・SNS広告などに</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Smartphone className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute top-0 -left-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    2
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">患者さんが診断</h3>
                  <p className="text-gray-500 text-sm">スマホで約2分</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform duration-300">
                    <LightbulbIcon className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute top-0 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    3
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">結果で気づく</h3>
                  <p className="text-gray-500 text-sm">「自分ごと」として認識</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative group">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute top-0 -left-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    4
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">予約ボタンで来院</h3>
                  <p className="text-gray-500 text-sm">その場でアクション</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 導入シーンセクション */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              USE CASES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              こんな場所で使えます
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              あらゆる広告媒体にQRコードを設置して、診断へ誘導できます
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
            {/* ポスティングチラシ */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">ポスティングチラシ</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    QRコードを載せて配布。診断結果に予約ボタンを表示し、来院につなげます。
                  </p>
                </div>
              </div>
            </div>

            {/* ホームページ・ブログ */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">ホームページ・ブログ</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    埋め込みコードを設置するだけ。サイト訪問者を予約につなげます。
                  </p>
                </div>
              </div>
            </div>

            {/* SNS広告・Instagram */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Instagram className="w-7 h-7 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">SNS広告・Instagram</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    診断リンクを投稿。興味を持った人をそのまま来院予約へ。
                  </p>
                </div>
              </div>
            </div>

            {/* 駅広告・看板 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">駅広告・看板</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    QRコードを大きく表示。通りすがりの人にもアプローチ。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 経路別計測セクション */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        {/* 装飾 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border border-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-60 h-60 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 border border-white rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
              ANALYTICS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              どの施策が効果的？経路別に計測
            </h2>
            <p className="text-blue-100 max-w-xl mx-auto">
              経路名は自由に設定OK。それぞれ別のQRコードを発行して効果を比較できます
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
              {/* ダッシュボードプレビュー */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <span className="font-bold text-gray-900">経路別アクセス統計</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">サンプルデータ</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-100 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="font-medium text-gray-700 text-sm">チラシ（駅前）</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">234</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    診断完了
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-100 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="font-medium text-gray-700 text-sm">チラシ（住宅街）</div>
                  </div>
                  <div className="text-3xl font-bold text-green-600">89</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    診断完了
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-100 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="font-medium text-gray-700 text-sm">医院前看板</div>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">156</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    診断完了
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100/50 hover:from-pink-100 hover:to-pink-100 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                    <div className="font-medium text-gray-700 text-sm">Instagram広告</div>
                  </div>
                  <div className="text-3xl font-bold text-pink-600">312</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    診断完了
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 pt-4 border-t border-gray-100">
                <span className="bg-gray-100 px-3 py-1.5 rounded-full">駅看板</span>
                <span className="bg-gray-100 px-3 py-1.5 rounded-full">ホームページ</span>
                <span className="bg-gray-100 px-3 py-1.5 rounded-full">LINE広告</span>
                <span className="bg-gray-100 px-3 py-1.5 rounded-full">紹介カード</span>
                <span className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full font-medium">+ 自由に追加</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
              FEATURES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              選ばれる理由
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              簡単に導入でき、効果を最大化する機能が揃っています
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 導入は5分で完了 */}
            <div className="group text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-10 h-10 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">5分</span>
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">導入は5分で完了</h3>
              <p className="text-gray-500 text-sm">
                登録してQRコードを発行するだけ。技術的な知識は不要です。
              </p>
            </div>

            {/* 結果画面をカスタマイズ */}
            <div className="group text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Palette className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">結果画面をカスタマイズ</h3>
              <p className="text-gray-500 text-sm">
                予約ボタン、LINE、院長コメントなど、自由に設定できます。
              </p>
            </div>

            {/* 経路別にQRコード発行 */}
            <div className="group text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-10 h-10 text-orange-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">∞</span>
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">経路別にQRコード発行</h3>
              <p className="text-gray-500 text-sm">
                「チラシ①」「医院前看板」など、自由な名前でQRコードを何個でも作成。
              </p>
            </div>

            {/* 効果を比較・分析 */}
            <div className="group text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-10 h-10 text-purple-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">効果を比較・分析</h3>
              <p className="text-gray-500 text-sm">
                どの経路からの診断が多いか、予約につながったかを可視化。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA セクション */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* 装飾 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              <span className="inline-block">今すぐ始めて、</span>
              <br />
              <span className="inline-block mt-[0.4em]">新患獲得を加速させましょう</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
              14日間の無料トライアルで、すべての機能をお試しいただけます。
              <br />
              導入は5分で完了します。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="xl" variant="white" className="w-full sm:w-auto group">
                  無料で始める
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="xl" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white">
                  <Play className="w-5 h-5 mr-2" />
                  デモを体験
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 py-12 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <Logo variant="dark" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">
                機能
              </a>
              <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                使い方
              </a>
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
                &copy; 2026 QRくるくる診断DX. All rights reserved.
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
