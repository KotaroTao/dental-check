// /dashboard/flyers は /dashboard と同じチラシ一覧画面を表示する（後方互換）。
// 既存のブックマーク・リンク（/dashboard/flyers/[id] への戻る先など）が引き続き動くよう、
// 内部実装は共通コンポーネントを参照する。
import FlyersListPage from "@/components/dashboard/flyers-list-page";

export default function FlyersListPageRoute() {
  return <FlyersListPage />;
}
