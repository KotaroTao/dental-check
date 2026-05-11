"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlyerDetailStats } from "@/components/dashboard/flyer-detail-stats";
import { ImageZoomModal } from "@/components/dashboard/image-zoom-modal";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Loader2,
} from "lucide-react";

// チラシに紐付くQR1件の集計情報（リスト画面で1行で表示する用）
// isActive=false の場合「非表示中」として行をグレーアウト表示し、編集導線は残す。
// 非表示にしたあと再度有効化できるよう、一覧から消さない方針。
interface LinkedChannel {
  id: string;
  name: string;
  channelType: "diagnosis" | "link";
  isActive: boolean;
  scans: number;
}

interface Flyer {
  id: string;
  name: string;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channelCount: number;
  channels: LinkedChannel[];
  createdAt: string;
  updatedAt: string;
}

export default function FlyersListPage() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/flyers");
        if (!response.ok) {
          if (mounted) setError("チラシ一覧の取得に失敗しました");
          return;
        }
        const data = await response.json();
        if (mounted) setFlyers(data.flyers);
      } catch {
        if (mounted) setError("通信エラーが発生しました");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">チラシ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            1枚のチラシに複数のQRを掲載する場合は、チラシを作成して各QRを紐付けてください。
          </p>
        </div>
        <Link href="/dashboard/flyers/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            新規チラシ作成
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {flyers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 space-y-3">
            <p>まだチラシが登録されていません。</p>
            <p className="text-xs text-gray-400">
              「新規チラシ作成」からチラシを作り、そのチラシに紐づけてQRを追加してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortFlyersByStartDate(flyers).map((f) => (
            <FlyerCard key={f.id} flyer={f} />
          ))}
        </div>
      )}
    </div>
  );
}

// 1枚のチラシカード（チラシ情報 + 紐付くQR詳細表）
function FlyerCard({ flyer: f }: { flyer: Flyer }) {
  // チラシ画像クリックで開く拡大プレビュー用の URL（null なら閉じている）
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate">{f.name}</div>
            {/* チラシ作成日（DBの created_at をフォーマット表示。編集不可） */}
            <div className="text-[11px] font-normal text-gray-500 mt-0.5">
              作成日: {formatJaDate(f.createdAt)}
            </div>
          </div>
          <Link href={`/dashboard/flyers/${f.id}`}>
            <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs">
              <Pencil className="w-3 h-3 mr-1" />
              編集
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-2">
          <FlyerThumb url={f.imageUrl} alt="表" onClick={setZoomUrl} />
          <FlyerThumb url={f.imageUrl2} alt="裏" onClick={setZoomUrl} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat
            label="配布枚数"
            value={f.distributionQuantity !== null ? `${f.distributionQuantity.toLocaleString()}枚` : "—"}
          />
          <Stat
            label="予算"
            value={f.budget !== null ? `¥${f.budget.toLocaleString()}` : "—"}
          />
          <Stat label="配布方法" value={f.distributionMethod || "—"} />
          <Stat label="配布開始日" value={formatStartDate(f.distributionPeriod)} />
        </div>

        {/* 紐付くQR一覧（1QR1行・スマホでも崩れないようにヘッダ + tabular-nums で整列） */}
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs text-gray-500">
            紐付けQR: <span className="font-medium text-gray-800">{f.channelCount}件</span>
          </div>
          {f.channels.length > 0 && (
            <LinkedChannelsTable
              channels={f.channels}
              quantity={f.distributionQuantity}
              budget={f.budget}
            />
          )}
          {/* このチラシ配下にQRを追加するボタン
              チラシ起点でQRを増やすフローを一覧ページ上でも完結できるようにする */}
          <Link
            href={`/dashboard/flyers/${f.id}/channels/new`}
            className="inline-flex items-center justify-center gap-1 w-full h-8 rounded border border-dashed border-blue-300 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            このチラシにQRを追加
          </Link>
        </div>

        {/* 詳細統計（折りたたみ）: 性別/年齢/エリア/履歴 */}
        <FlyerDetailStats
          flyerId={f.id}
          channels={f.channels.map((c) => ({
            id: c.id,
            name: c.name,
            channelType: c.channelType,
            isActive: c.isActive,
          }))}
        />
      </CardContent>
      {/* チラシ画像の拡大プレビュー（クリックで開く） */}
      <ImageZoomModal url={zoomUrl} alt={f.name} onClose={() => setZoomUrl(null)} />
    </Card>
  );
}

// 紐付くQRの一覧表（1QR1行・PC・スマホ共通レイアウト）
// 列構成: QR名 / QRスキャン / QRスキャン率 / QRスキャン単価
// ─ 率 = ch.scans ÷ flyer.distributionQuantity
// ─ 単価 = flyer.budget ÷ ch.scans
// 配布枚数 / 予算 が未入力なら "—" を表示
function LinkedChannelsTable({
  channels,
  quantity,
  budget,
}: {
  channels: LinkedChannel[];
  quantity: number | null;
  budget: number | null;
}) {
  return (
    <div className="rounded border border-gray-200 overflow-hidden">
      {/* ヘッダ行（編集列はアイコンのみなのでラベルなしの空白） */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-2 py-1.5 bg-gray-50 text-[10px] text-gray-500">
        <div>QR名（管理用）</div>
        <div className="w-12 text-right">スキャン</div>
        <div className="w-14 text-right">読込率</div>
        <div className="w-16 text-right">スキャン単価</div>
        <div className="w-7" aria-hidden="true" />
      </div>
      <div className="divide-y divide-gray-100">
        {channels.map((ch) => {
          const rate =
            quantity !== null && quantity > 0
              ? (ch.scans / quantity) * 100
              : null;
          // 単価: 予算 ÷ スキャン数（スキャン数が0なら計算不可）
          const cost =
            budget !== null && budget > 0 && ch.scans > 0
              ? Math.round(budget / ch.scans)
              : null;
          // 非表示（isActive=false）の QR は行全体をグレーアウトし、
          // 名前の右に「非表示」バッジを出す。編集ボタンは生かして再有効化導線を残す。
          // 注意: `!ch.isActive` だと API レスポンスから isActive が抜けたとき
          // undefined → true 扱いになって誤判定する。明示的に === false で比較する。
          const inactive = ch.isActive === false;
          return (
            <div
              key={ch.id}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-2 py-1.5 text-xs items-center ${
                inactive ? "bg-gray-50/60 text-gray-400" : ""
              }`}
            >
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="truncate" title={ch.name}>
                  {ch.name}
                </span>
                {inactive && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-200 text-gray-600">
                    非表示
                  </span>
                )}
              </div>
              <div className="w-12 text-right tabular-nums">
                {ch.scans.toLocaleString()}
              </div>
              <div
                className={`w-14 text-right tabular-nums ${
                  inactive ? "text-gray-400" : "text-blue-600"
                }`}
              >
                {rate !== null ? `${rate.toFixed(2)}%` : "—"}
              </div>
              <div
                className={`w-16 text-right tabular-nums ${
                  inactive ? "text-gray-400" : "text-amber-600"
                }`}
              >
                {cost !== null ? `¥${cost.toLocaleString()}` : "—"}
              </div>
              {/* QR個別の編集ボタン（非表示QRでも生きていて再有効化に使える） */}
              <Link
                href={`/dashboard/channels/${ch.id}`}
                title="このQRを編集"
                aria-label="このQRを編集"
                className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlyerThumb({
  url,
  alt,
  onClick,
}: {
  url: string | null;
  alt: string;
  onClick?: (url: string) => void;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        // 一覧サムネイルも全体が見えるよう object-contain。背景色で余白を埋める。
        // クリックで拡大プレビューを開く
        className="w-20 h-20 object-contain rounded border bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onClick?.(url)}
      />
    );
  }
  return (
    <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
      <ImageIcon className="w-6 h-6 text-gray-300" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1.5">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  );
}

// 日付を「2026年1月15日」形式に整形するヘルパー
// API からは ISO 文字列（"2026-01-15T01:23:45.000Z"）で届くので、Date に変換してから出力
function formatJaDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return "—";
  }
}

// 配布開始日を一覧カードで表示するための整形。
// 新仕様（type=date 入力）では "YYYY-MM-DD" が保存される。
// 旧データ（自由記入の "2024年1月〜3月" 等）は Date としてパースできないので、
// その場合は元の文字列をそのまま表示する。
function formatStartDate(value: string | null): string {
  if (!value) return "—";
  // YYYY-MM-DD（または ISO 文字列）として Date が有効ならフォーマット
  const d = new Date(value);
  if (!isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return value; // 旧データは元の文字列で表示
}

// チラシ一覧の並び順を「配布開始日順」にするヘルパー。
// ルール:
//   1) 配布開始日が未入力（null/空文字/無効な値）のチラシは上に並べる
//   2) その下に配布開始日が入力されているチラシ。新しい日付ほど上（降順）
// 旧データ（"2024年1月〜3月" 等）は Date パース不可なので「未入力」と同じ扱いで上に並ぶ。
function sortFlyersByStartDate(flyers: Flyer[]): Flyer[] {
  const parseStart = (v: string | null): number | null => {
    if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  // 元の配列を変更しないようにスプレッドしてからソート
  return [...flyers].sort((a, b) => {
    const aTs = parseStart(a.distributionPeriod);
    const bTs = parseStart(b.distributionPeriod);
    // 1) 未入力（null）は上に
    if (aTs === null && bTs === null) {
      // 両方未入力なら作成日が新しい順
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (aTs === null) return -1;
    if (bTs === null) return 1;
    // 2) 配布開始日の新しい順（降順）
    return bTs - aTs;
  });
}
