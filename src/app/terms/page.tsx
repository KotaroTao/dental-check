import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function TermsPage() {
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
              <span className="font-bold text-lg text-gray-900">くるくる診断DX<span className="text-[0.5em]"> for Dental</span></span>
            </Link>
          </div>
        </div>
      </nav>

      {/* コンテンツ */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>

        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第1条（適用）</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約は、株式会社ファンクション・ティ（以下「当社」）が提供する「くるくる診断DX for Dental」（以下「本サービス」）の
              利用に関する条件を定めるものです。ユーザーは本規約に同意した上で本サービスを利用するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第2条（定義）</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>「ユーザー」とは、本サービスを利用する歯科医院またはその管理者をいいます。</li>
              <li>「診断コンテンツ」とは、本サービスで提供される各種診断機能をいいます。</li>
              <li>「エンドユーザー」とは、ユーザーが提供するQRコード等を通じて診断を受ける一般利用者をいいます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第3条（アカウント登録）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>ユーザーは、正確かつ最新の情報を提供して登録を行うものとします。</li>
              <li>登録情報に変更があった場合、速やかに更新するものとします。</li>
              <li>アカウント情報の管理はユーザーの責任とし、第三者への貸与・譲渡は禁止します。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第4条（料金・支払い）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>本サービスの利用料金は、別途定める料金表に従います。</li>
              <li>14日間の無料トライアル期間があります。</li>
              <li>有料プランへの移行後は、毎月自動更新となります。</li>
              <li>支払いはクレジットカードによる決済となります。</li>
              <li>一度支払われた料金は、原則として返金いたしません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第5条（禁止事項）</h2>
            <p className="text-gray-700 leading-relaxed mb-4">ユーザーは、以下の行為を行ってはなりません。</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>法令または公序良俗に反する行為</li>
              <li>当社または第三者の知的財産権を侵害する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセス、クラッキング等の行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>本サービスを医療行為として使用する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第6条（免責事項）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>本サービスで提供される診断コンテンツは医療行為ではなく、診断結果について当社は一切の責任を負いません。</li>
              <li>本サービスの利用に起因してユーザーまたはエンドユーザーに生じた損害について、当社は責任を負いません。</li>
              <li>システム障害、メンテナンス等によるサービス停止について、当社は責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第7条（サービスの変更・終了）</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、事前の通知なく本サービスの内容を変更し、または提供を終了することができるものとします。
              サービス終了の場合は、合理的な期間をもって事前に通知するよう努めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第8条（解約）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>ユーザーは、管理画面からいつでも解約手続きを行うことができます。</li>
              <li>解約後も、当該月の契約期間終了まではサービスを利用できます。</li>
              <li>解約に伴う日割り返金は行いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第9条（知的財産権）</h2>
            <p className="text-gray-700 leading-relaxed">
              本サービスに関する知的財産権は、すべて当社に帰属します。
              ユーザーは、本サービスを通じて提供されるコンテンツを、本サービスの利用目的の範囲内でのみ使用できます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第10条（規約の変更）</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、必要に応じて本規約を変更することができます。
              変更後の規約は、本ページに掲載した時点から効力を生じるものとします。
              重要な変更の場合は、登録メールアドレスに通知いたします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">第11条（準拠法・管轄）</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約は日本法に準拠し、本サービスに関する紛争については、神戸地方裁判所を第一審の専属的合意管轄裁判所とします。
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
            &copy; 2026 くるくる診断DX for Dental. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            運営: <a href="https://function-t.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">株式会社ファンクション・ティ</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
