import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
          </div>
        </div>
      </nav>

      {/* コンテンツ */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <tbody className="divide-y">
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700 w-1/3">
                  販売業者
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  株式会社ファンクション・ティ
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  運営責任者
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  代表取締役 田尾耕太郎
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  所在地
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  兵庫県西宮市北名次町5-9-301
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  電話番号
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  お問い合わせはメールにてお願いいたします
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  メールアドレス
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  mail@function-t.com
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  販売URL
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  https://qrqr-dental.com
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  販売価格
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  月額 3,000円（税抜）/ 3,300円（税込）
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  商品代金以外の必要料金
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  なし
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  支払方法
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  クレジットカード決済（VISA、Mastercard、JCB、American Express、Diners Club）
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  支払時期
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  ご登録時および毎月の契約更新日
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  サービス提供時期
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  お申込み完了後、即時ご利用いただけます
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  無料トライアル
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  14日間の無料トライアル期間があります。<br />
                  トライアル期間中はクレジットカードの登録は不要です。
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  解約・キャンセル
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  管理画面よりいつでも解約可能です。<br />
                  解約後は次回更新日まではサービスをご利用いただけます。<br />
                  日割り返金はございません。
                </td>
              </tr>
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-700">
                  返金ポリシー
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  デジタルサービスの性質上、お支払い後の返金はお受けしておりません。<br />
                  無料トライアル期間中に十分にご検討ください。
                </td>
              </tr>
            </tbody>
          </table>
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
            &copy; 2026 QRくるくる診断DX. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            運営: <a href="https://function-t.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">株式会社ファンクション・ティ</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
