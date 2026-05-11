// /dashboard はチラシ管理を主軸とする。各チラシカード内に
// 性別/年齢/QR読み込みエリア/QR読み込み履歴 を折りたたみで内包させ、
// 旧 /dashboard/analytics の内容を統合済み。
import FlyersListPage from "@/components/dashboard/flyers-list-page";

export default function DashboardHomePage() {
  return <FlyersListPage />;
}
