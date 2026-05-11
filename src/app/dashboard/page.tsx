// Phase 3: /dashboard をチラシ一覧（旧 /dashboard/flyers）に置き換え、
// 旧ダッシュボード（QR一覧 + 効果測定サマリー + 履歴等）は /dashboard/analytics に移管。
// この page は共通コンポーネント FlyersListPage をそのままレンダリングする。
import FlyersListPage from "@/components/dashboard/flyers-list-page";

export default function DashboardHomePage() {
  return <FlyersListPage />;
}
