"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Image as ImageIcon,
  TrendingUp,
  Pencil,
  ExternalLink,
  Loader2,
  Layers,
  QrCode,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// チラシに紐付くQR1件分（折りたたみ展開時に表示）
interface ChannelInFlyer {
  id: string;
  name: string;
  channelType: "diagnosis" | "link";
  qrScans: number;
  scans: number;
}

// チラシ単位の集計
interface FlyerAnalysis {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  name: string;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  channels: ChannelInFlyer[];
  channelCount: number;
  qrScans: number;       // 配下チャネルの合計
  scans: number;         // 配下チャネルの合計（フォールバック含む）
  qrScanRate: number | null;
  qrScanCost: number | null;
  createdAt: string;
}

// チラシに属さない単独QR
interface StandaloneChannel {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  name: string;
  channelType: "diagnosis" | "link";
  imageUrl: string | null;
  imageUrl2: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  qrScans: number;
  scans: number;
  qrScanRate: number | null;
  qrScanCost: number | null;
  createdAt: string;
}

interface MethodStat {
  method: string;
  count: number;
  totalScans: number;
  totalQuantity: number;
  totalBudget: number;
  avgQrScanRate: number | null;
  avgQrScanCost: number | null;
}

interface AnalysisData {
  flyers: FlyerAnalysis[];
  standaloneChannels: StandaloneChannel[];
  methodStats: MethodStat[];
  period: number;
}

type SortKey = "scans" | "qrScanRate" | "qrScanCost";

export default function FlyerAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(365);
  const [methodFilter, setMethodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scans");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // 各チラシ行の「QR一覧」展開状態を保持
  // 折りたたみ廃止 — 旧 expandedFlyerIds state は削除

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ days: String(period) });
      if (methodFilter) params.set("method", methodFilter);
      const response = await fetch(`/api/admin/flyer-analysis?${params}`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        setError("データの取得に失敗しました");
      }
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [period, methodFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // QR編集ページを開く（管理者→医院になりすまし→新タブで遷移）
  const [openingChannelId, setOpeningChannelId] = useState<string | null>(null);
  const handleOpenChannelEditor = async (clinicId: string, channelId: string) => {
    setOpeningChannelId(channelId);
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/impersonate`, {
        method: "POST",
      });
      if (response.ok) {
        window.open(`/dashboard/channels/${channelId}`, "_blank");
      } else {
        const data = await response.json();
        alert(data.error || "編集ページを開けませんでした");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setOpeningChannelId(null);
    }
  };

  // チラシ編集ページを開く（同様になりすまし→新タブで遷移）
  const [openingFlyerId, setOpeningFlyerId] = useState<string | null>(null);
  const handleOpenFlyerEditor = async (clinicId: string, flyerId: string) => {
    setOpeningFlyerId(flyerId);
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}/impersonate`, {
        method: "POST",
      });
      if (response.ok) {
        window.open(`/dashboard/flyers/${flyerId}`, "_blank");
      } else {
        const data = await response.json();
        alert(data.error || "編集ページを開けませんでした");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setOpeningFlyerId(null);
    }
  };

  // ソート関数。null は常に末尾。
  const sortItems = <T extends { scans: number; qrScanRate: number | null; qrScanCost: number | null }>(items: T[]) => {
    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const aIsNull = aVal === null || aVal === undefined;
      const bIsNull = bVal === null || bVal === undefined;
      if (aIsNull && bIsNull) return 0;
      if (aIsNull) return 1;
      if (bIsNull) return -1;
      return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>;
  }

  if (!data) return null;

  // 配布方法別チャート用データ
  const methodChartData = data.methodStats
    .filter((m) => m.method !== "未設定")
    .map((m) => ({
      method: m.method,
      QRアクセス率: m.avgQrScanRate ?? 0,
      QRアクセス単価: m.avgQrScanCost ?? 0,
    }));

  const sortedFlyers = sortItems(data.flyers);
  const sortedStandalone = sortItems(data.standaloneChannels);

  // 集計値は SummaryCard 撤去に伴い使用しなくなったので削除した。
  // チラシごと・単独QRごとの値は各 Row コンポーネント内で扱う。

  const METHOD_OPTIONS = [
    "ポスティング",
    "新聞折込",
    "DM",
    "メール",
    "LP (広告から誘導)",
    "その他",
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">QR効果分析</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {[
              { days: 30, label: "30日" },
              { days: 90, label: "90日" },
              { days: 180, label: "180日" },
              { days: 365, label: "365日" },
              { days: 0, label: "全期間" },
            ].map(({ days, label }) => (
              <Button
                key={days}
                variant={period === days ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 配布方法フィルタ */}
      <div className="bg-white rounded-lg border p-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-gray-500 shrink-0 mr-1">配布方法:</span>
        <button
          onClick={() => setMethodFilter("")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            methodFilter === ""
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          すべて
        </button>
        {METHOD_OPTIONS.map((method) => (
          <button
            key={method}
            onClick={() => setMethodFilter(method)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
              methodFilter === method
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {method}
          </button>
        ))}
      </div>

      {/* 全体サマリーは廃止（チラシ単位の数値で十分なため） */}

      {/* 配布方法別比較チャート */}
      {methodChartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              配布方法別の効果比較
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} unit="%" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `¥${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "QRアクセス単価"
                        ? `¥${Number(value).toLocaleString()}`
                        : `${value}%`
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="QRアクセス率" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="QRアクセス単価" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 並び替えセレクト */}
      <div className="flex items-center gap-2 text-sm justify-end">
        <span className="text-xs text-gray-500">並び替え:</span>
        <select
          value={`${sortKey}:${sortAsc ? "asc" : "desc"}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            setSortKey(key as SortKey);
            setSortAsc(dir === "asc");
          }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="scans:desc">QRアクセス数（多い順）</option>
          <option value="qrScanRate:desc">QRアクセス率（高い順）</option>
          <option value="qrScanCost:asc">QRアクセス単価（安い順）</option>
        </select>
      </div>

      {/* チラシ別詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            チラシ別詳細（{sortedFlyers.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedFlyers.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              該当するチラシがありません
            </div>
          ) : (
            <div className="divide-y">
              {sortedFlyers.map((f) => (
                <FlyerRow
                  key={f.id}
                  flyer={f}
                  onPreviewImage={setPreviewImage}
                  onEditFlyer={() => handleOpenFlyerEditor(f.clinicId, f.id)}
                  onEditChannel={(channelId) => handleOpenChannelEditor(f.clinicId, channelId)}
                  isOpeningFlyer={openingFlyerId === f.id}
                  openingChannelId={openingChannelId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 未分類QR（チラシ未紐付け）の救済表示
          Phase 2 ではすべてのQRがチラシに属するように移行されているはずだが、
          万一 flyerId=null のQRが残っている場合は警告と一緒に表示する */}
      {sortedStandalone.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-600" />
              未分類QR（{sortedStandalone.length}件）
              <span className="ml-2 text-xs font-normal text-amber-700">
                チラシに紐付いていないQR — 該当医院の対応が必要
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedStandalone.map((ch) => (
                <StandaloneChannelRow
                  key={ch.id}
                  ch={ch}
                  onPreviewImage={setPreviewImage}
                  onEdit={() => handleOpenChannelEditor(ch.clinicId, ch.id)}
                  isOpening={openingChannelId === ch.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 画像プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-[80vh] rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// SummaryCard は廃止された（全体サマリーは不要との要件のため）。
// SummaryTile も他で使われていないが、念のため残し将来再利用に備える。

// チラシ1件分の詳細行（展開時に配下のQR一覧を表示）
// チラシ1件の行（折りたたみ廃止、常に紐付QR一覧を表示）
// レイアウトは医院ダッシュボード(/dashboard) のチラシカード形式に揃える：
//   1段目: 画像 + クリニック名/チラシ名 + 配布方法/配布開始日 + チラシ編集ボタン
//   2段目: 5タイル（配布枚数 / 予算 / QRアクセス / QRアクセス率 / QRアクセス単価）
//   3段目: 紐付QR一覧テーブル（QR名 / アクセス / アクセス率 / 編集）
function FlyerRow({
  flyer,
  onPreviewImage,
  onEditFlyer,
  onEditChannel,
  isOpeningFlyer,
  openingChannelId,
}: {
  flyer: FlyerAnalysis;
  onPreviewImage: (url: string) => void;
  onEditFlyer: () => void;
  onEditChannel: (channelId: string) => void;
  isOpeningFlyer: boolean;
  openingChannelId: string | null;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 space-y-3">
      {/* 1段目: メタ情報 */}
      <div className="flex items-start gap-3">
        <div className="flex gap-1 shrink-0">
          <Thumbnail url={flyer.imageUrl} alt="表" onClick={onPreviewImage} />
          <Thumbnail url={flyer.imageUrl2} alt="裏" onClick={onPreviewImage} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 truncate">{flyer.clinicName}</div>
          <div className="text-sm sm:text-base font-medium truncate">
            {flyer.name}
            <span className="ml-2 text-xs text-gray-500 font-normal">
              QR×{flyer.channelCount}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {flyer.distributionMethod ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                {flyer.distributionMethod}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">
                配布方法未設定
              </span>
            )}
            <span className="text-gray-500 whitespace-nowrap">
              配布開始日: <span className="text-gray-800 font-medium">{formatStartDate(flyer.distributionPeriod)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button
            size="sm"
            disabled={isOpeningFlyer}
            onClick={onEditFlyer}
            title="医院になりすましてチラシ編集ページを別タブで開く"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            {isOpeningFlyer ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                開いています…
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                チラシ編集
                <ExternalLink className="w-3 h-3 opacity-70" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2段目: 5タイル */}
      <MetricTiles
        quantity={flyer.distributionQuantity}
        budget={flyer.budget}
        scans={flyer.scans}
        qrScanRate={flyer.qrScanRate}
        qrScanCost={flyer.qrScanCost}
      />

      {/* 3段目: 紐付QR一覧（常に表示・ダッシュボードと同じテーブル形式） */}
      <div className="border-t pt-3 space-y-2">
        <div className="text-xs text-gray-500">
          紐付けQR: <span className="font-medium text-gray-800">{flyer.channelCount}件</span>
        </div>
        {flyer.channels.length > 0 ? (
          <LinkedChannelsTable
            channels={flyer.channels}
            quantity={flyer.distributionQuantity}
            onEditChannel={onEditChannel}
            openingChannelId={openingChannelId}
          />
        ) : (
          <div className="text-xs text-gray-500">このチラシに紐付いているQRはありません</div>
        )}
      </div>
    </div>
  );
}

// チラシ配下のQR一覧テーブル（管理者画面用）
// 列: QR名（管理用） / QRアクセス / QRアクセス率 / 編集
// 各QRの QRアクセス率 = ch.scans ÷ flyer.distributionQuantity
// （単価はチラシレベルの合計値で表示するためここでは出さない）
function LinkedChannelsTable({
  channels,
  quantity,
  onEditChannel,
  openingChannelId,
}: {
  channels: FlyerAnalysis["channels"];
  quantity: number | null;
  onEditChannel: (channelId: string) => void;
  openingChannelId: string | null;
}) {
  return (
    <div className="rounded border border-gray-200 overflow-hidden">
      {/* ヘッダ行 */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 bg-gray-50 text-[10px] text-gray-500">
        <div>QR名（管理用）</div>
        <div className="w-16 text-right">アクセス</div>
        <div className="w-16 text-right">アクセス率</div>
        <div className="w-7" aria-hidden="true" />
      </div>
      <div className="divide-y divide-gray-100">
        {channels.map((ch) => {
          const rate =
            quantity !== null && quantity > 0
              ? (ch.scans / quantity) * 100
              : null;
          return (
            <div
              key={ch.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 text-xs items-center"
            >
              <div className="min-w-0 truncate" title={ch.name}>
                {ch.name}
              </div>
              <div className="w-16 text-right tabular-nums">
                {ch.scans.toLocaleString()}
              </div>
              <div className="w-16 text-right tabular-nums text-blue-600">
                {rate !== null ? `${rate.toFixed(2)}%` : "—"}
              </div>
              <button
                type="button"
                onClick={() => onEditChannel(ch.id)}
                disabled={openingChannelId === ch.id}
                title="このQRを編集（医院になりすまし）"
                aria-label="このQRを編集"
                className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {openingChannelId === ch.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 単独QR詳細1行（チラシなし）
function StandaloneChannelRow({
  ch,
  onPreviewImage,
  onEdit,
  isOpening,
}: {
  ch: StandaloneChannel;
  onPreviewImage: (url: string) => void;
  onEdit: () => void;
  isOpening: boolean;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex gap-1 shrink-0">
          <Thumbnail url={ch.imageUrl} alt="表" onClick={onPreviewImage} />
          <Thumbnail url={ch.imageUrl2} alt="裏" onClick={onPreviewImage} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 truncate">{ch.clinicName}</div>
          <div className="text-sm sm:text-base font-medium truncate">
            {ch.name}
            <span className="ml-2 text-xs text-gray-500 font-normal">
              {ch.channelType === "diagnosis" ? "診断付き" : "リンク型"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {ch.distributionMethod ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                {ch.distributionMethod}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">
                配布方法未設定
              </span>
            )}
            <span className="text-gray-500 whitespace-nowrap">
              配布開始日: <span className="text-gray-800 font-medium">{formatStartDate(ch.distributionPeriod)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button
            size="sm"
            disabled={isOpening}
            onClick={onEdit}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1"
          >
            {isOpening ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                開いています…
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                QR編集
                <ExternalLink className="w-3 h-3 opacity-70" />
              </>
            )}
          </Button>
        </div>
      </div>

      <MetricTiles
        quantity={ch.distributionQuantity}
        budget={ch.budget}
        scans={ch.scans}
        qrScanRate={ch.qrScanRate}
        qrScanCost={ch.qrScanCost}
      />
    </div>
  );
}

// 5タイル（配布枚数/予算/QRアクセス/QRアクセス率/QRアクセス単価）
// チラシ行と単独QR行で共通利用
function MetricTiles({
  quantity,
  budget,
  scans,
  qrScanRate,
  qrScanCost,
}: {
  quantity: number | null;
  budget: number | null;
  scans: number;
  qrScanRate: number | null;
  qrScanCost: number | null;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-center">
      <DetailMetric
        label="配布枚数"
        value={quantity !== null ? `${quantity.toLocaleString()}枚` : ""}
        missing={quantity === null}
      />
      <DetailMetric
        label="予算"
        value={budget !== null ? `¥${budget.toLocaleString()}` : ""}
        missing={budget === null}
      />
      <DetailMetric
        label="QRアクセス"
        value={scans.toLocaleString()}
        color="text-blue-600"
      />
      <DetailMetric
        label="QRアクセス率"
        value={qrScanRate !== null ? `${qrScanRate.toFixed(2)}%` : ""}
        color="text-blue-600"
        sub="QRアクセス÷配布枚数"
        missing={qrScanRate === null}
      />
      <DetailMetric
        label="QRアクセス単価"
        value={
          qrScanCost !== null
            ? `¥${qrScanCost.toLocaleString()}`
            : budget === null
            ? ""
            : "—"
        }
        color="text-amber-600"
        sub="予算÷QRアクセス"
        missing={budget === null}
      />
    </div>
  );
}

// 表/裏画像サムネイル
function Thumbnail({
  url,
  alt,
  onClick,
}: {
  url: string | null;
  alt: string;
  onClick: (url: string) => void;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        title={alt === "表" ? "表面" : "裏面"}
        className="w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80"
        onClick={() => onClick(url)}
      />
    );
  }
  return (
    <div
      className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center"
      title={alt === "表" ? "表面（未登録）" : "裏面（未登録）"}
    >
      <ImageIcon className="w-5 h-5 text-gray-300" />
    </div>
  );
}

// 詳細行用タイル
function DetailMetric({
  label,
  value,
  color,
  sub,
  missing,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  missing?: boolean;
}) {
  const displayValue = missing ? "データ未入力" : value;
  const valueColor = missing ? "text-red-600" : color || "text-gray-800";
  const valueSize = missing ? "text-xs" : "text-base";
  return (
    <div className="bg-gray-50 rounded px-3 py-2">
      <div className="text-[11px] text-gray-500 whitespace-nowrap">{label}</div>
      <div className={`${valueSize} font-bold tabular-nums whitespace-nowrap ${valueColor}`}>
        {displayValue}
      </div>
      {sub && <div className="text-[10px] text-gray-400 whitespace-nowrap">{sub}</div>}
    </div>
  );
}

// SummaryTile / SummaryCard は廃止された（全体サマリー撤去）

// 配布開始日を「2026年5月11日」形式に整形。
// 新仕様（type=date 入力）では "YYYY-MM-DD" が保存される。
// 旧データ（自由記入の "2024年1月〜3月" 等）は Date パースできないため、その場合は
// 元の文字列をそのまま表示する。未入力は "—"。
function formatStartDate(value: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
  }
  return value;
}

