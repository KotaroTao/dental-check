import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">くるくるQR<span className="text-[0.5em]"> for Dental</span></span>
            </Link>
          </div>
        </div>
      </nav>

      {/* コンテンツ */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. はじめに</h2>
            <p className="text-gray-700 leading-relaxed">
              株式会社ファンクション・ティ（以下「当社」）は、くるくるQR for Dental（以下「本サービス」）において、
              お客様の個人情報の保護に努めております。本プライバシーポリシーは、本サービスにおける個人情報の取り扱いについて定めるものです。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. 収集する情報</h2>
            <p className="text-gray-700 leading-relaxed mb-4">当社は、以下の情報を収集することがあります。</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>医院名、メールアドレス、電話番号などの登録情報</li>
              <li>クレジットカード情報（決済代行会社を通じて処理）</li>
              <li>サービス利用状況に関するデータ</li>
              <li>診断結果の統計データ（個人を特定しない形式）</li>
              <li>Cookie等を利用したアクセス情報</li>
              <li>位置情報（ユーザーの許可を得た場合のみ、都道府県・市区町村レベル）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. 情報の利用目的</h2>
            <p className="text-gray-700 leading-relaxed mb-4">収集した情報は、以下の目的で利用いたします。</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>本サービスの提供・運営</li>
              <li>お客様サポートへの対応</li>
              <li>サービス改善のための分析</li>
              <li>請求処理・決済</li>
              <li>重要なお知らせの送付</li>
              <li>新機能・アップデートのご案内</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. 情報の第三者提供</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-4">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護に必要な場合</li>
              <li>業務委託先に必要な範囲で提供する場合（守秘義務を課した上で）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. 情報の安全管理</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、個人情報の漏洩、滅失、毀損の防止のため、適切なセキュリティ対策を講じております。
              SSL/TLS暗号化通信の採用、アクセス制限の実施など、技術的・組織的な安全管理措置を実施しています。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Cookieの使用</h2>
            <p className="text-gray-700 leading-relaxed">
              本サービスでは、サービス向上のためCookieを使用しています。
              ブラウザの設定でCookieを無効にすることも可能ですが、一部機能がご利用いただけなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. 位置情報の取得・利用</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              本サービスでは、診断開始時の利用規約への同意に基づき、ブラウザの位置情報機能を使用して
              位置情報を取得し、以下の目的で利用しております。
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>■ 利用目的</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>診断利用状況の地域分布の把握</li>
              <li>地域ごとの歯科健康意識の傾向分析</li>
              <li>歯科医院様のサービス改善支援</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-2">
              <strong>■ 位置情報の取得について</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>ブラウザの位置情報許可ダイアログで拒否した場合、位置情報は取得されません</li>
              <li>取得した位置情報は都道府県・市区町村レベルに変換して記録し、GPS座標や詳細な住所は保存されません</li>
              <li>位置情報を許可しなくても診断機能はすべてご利用いただけます</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed">
              個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。<br /><br />
              株式会社ファンクション・ティ<br />
              メール: mail@function-t.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. 改定</h2>
            <p className="text-gray-700 leading-relaxed">
              本ポリシーは、法令の改正やサービス内容の変更に伴い、予告なく改定されることがあります。
              改定後のポリシーは、本ページに掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <div className="pt-4 border-t text-sm text-gray-500">
            <p>制定日: 2026年1月1日</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            ← トップページに戻る
          </Link>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-gray-900 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            &copy; 2026 くるくるQR for Dental. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            運営: <a href="https://function-t.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">株式会社ファンクション・ティ</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
