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
  ChevronDown,
  ChevronRight,
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
  const [expandedFlyerIds, setExpandedFlyerIds] = useState<Set<string>>(new Set());

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
      QRスキャン率: m.avgQrScanRate ?? 0,
      QRスキャン単価: m.avgQrScanCost ?? 0,
    }));

  const sortedFlyers = sortItems(data.flyers);
  const sortedStandalone = sortItems(data.standaloneChannels);

  // サマリーは「チラシ + 単独QR」を統合して集計
  // → 同じ配布枚数を重複して足さない（Flyerの配布枚数は1度だけカウント）
  const totalQuantity =
    data.flyers.reduce((acc, f) => acc + (f.distributionQuantity ?? 0), 0) +
    data.standaloneChannels.reduce((acc, ch) => acc + (ch.distributionQuantity ?? 0), 0);
  const totalBudget =
    data.flyers.reduce((acc, f) => acc + (f.budget ?? 0), 0) +
    data.standaloneChannels.reduce((acc, ch) => acc + (ch.budget ?? 0), 0);
  const totalScans =
    data.flyers.reduce((acc, f) => acc + f.scans, 0) +
    data.standaloneChannels.reduce((acc, ch) => acc + ch.scans, 0);
  const totalUnitCount = data.flyers.length + data.standaloneChannels.length;

  const METHOD_OPTIONS = [
    "ポスティング",
    "新聞折込",
    "DM",
    "メール",
    "LP (広告から誘導)",
    "その他",
  ];

  const toggleFlyer = (id: string) => {
    setExpandedFlyerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

      {/* QR掲載方法フィルタ */}
      <div className="bg-white rounded-lg border p-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-gray-500 shrink-0 mr-1">掲載方法:</span>
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

      {/* 全体サマリー（チラシ + 単独QR を統合した数値） */}
      <SummaryCard
        unitCount={totalUnitCount}
        flyerCount={data.flyers.length}
        standaloneCount={data.standaloneChannels.length}
        scans={totalScans}
        quantity={totalQuantity}
        budget={totalBudget}
      />

      {/* 配布方法別比較チャート */}
      {methodChartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              QR掲載方法別の効果比較
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
                      name === "QRスキャン単価"
                        ? `¥${Number(value).toLocaleString()}`
                        : `${value}%`
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="QRスキャン率" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="QRスキャン単価" fill="#F59E0B" />
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
          <option value="scans:desc">QRスキャン数（多い順）</option>
          <option value="qrScanRate:desc">QRスキャン率（高い順）</option>
          <option value="qrScanCost:asc">QRスキャン単価（安い順）</option>
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
                  expanded={expandedFlyerIds.has(f.id)}
                  onToggle={() => toggleFlyer(f.id)}
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

      {/* 単独QR詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            単独QR詳細（{sortedStandalone.length}件）
            <span className="ml-2 text-xs font-normal text-gray-500">
              チラシに紐付かないQR
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedStandalone.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              該当する単独QRがありません
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

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

// 全体サマリーカード（チラシ + 単独QR を統合）
function SummaryCard({
  unitCount,
  flyerCount,
  standaloneCount,
  scans,
  quantity,
  budget,
}: {
  unitCount: number;
  flyerCount: number;
  standaloneCount: number;
  scans: number;
  quantity: number;
  budget: number;
}) {
  const qrScanRateMissing = quantity <= 0;
  const qrScanRate = !qrScanRateMissing ? (scans / quantity) * 100 : null;
  const qrScanCostMissing = budget <= 0;
  const qrScanCost = !qrScanCostMissing && scans > 0 ? Math.round(budget / scans) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-5 h-5" />
          全体サマリー
          <span className="ml-auto text-xs text-gray-500 font-normal">
            {unitCount}件を集計（チラシ{flyerCount}件・単独QR{standaloneCount}件）
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
          <SummaryTile
            label="配布枚数"
            value={quantity > 0 ? `${quantity.toLocaleString()}枚` : ""}
            missing={quantity <= 0}
          />
          <SummaryTile
            label="予算"
            value={budget > 0 ? `¥${budget.toLocaleString()}` : ""}
            missing={budget <= 0}
          />
          <SummaryTile
            label="QRスキャン"
            value={scans.toLocaleString()}
            color="text-blue-600"
          />
          <SummaryTile
            label="QRスキャン率"
            value={qrScanRate !== null ? `${qrScanRate.toFixed(2)}%` : ""}
            sub="QRスキャン÷配布枚数"
            color="text-blue-600"
            missing={qrScanRateMissing}
          />
          <SummaryTile
            label="QRスキャン単価"
            value={
              qrScanCost !== null
                ? `¥${qrScanCost.toLocaleString()}`
                : qrScanCostMissing
                ? ""
                : "—"
            }
            sub="予算÷QRスキャン"
            color="text-amber-600"
            missing={qrScanCostMissing}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// チラシ1件分の詳細行（展開時に配下のQR一覧を表示）
function FlyerRow({
  flyer,
  expanded,
  onToggle,
  onPreviewImage,
  onEditFlyer,
  onEditChannel,
  isOpeningFlyer,
  openingChannelId,
}: {
  flyer: FlyerAnalysis;
  expanded: boolean;
  onToggle: () => void;
  onPreviewImage: (url: string) => void;
  onEditFlyer: () => void;
  onEditChannel: (channelId: string) => void;
  isOpeningFlyer: boolean;
  openingChannelId: string | null;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 space-y-3">
      {/* 1段目: メタ情報 + 展開ボタン */}
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="mt-1 shrink-0 p-1 rounded hover:bg-gray-200"
          aria-label={expanded ? "QR一覧を閉じる" : "QR一覧を開く"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

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
                掲載方法未設定
              </span>
            )}
            <span className="text-gray-500 whitespace-nowrap">
              配布期間: <span className="text-gray-800 font-medium">{flyer.distributionPeriod || "—"}</span>
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

      {/* 展開時: 配下のQR一覧 */}
      {expanded && (
        <div className="ml-7 bg-gray-50 rounded p-3 space-y-2">
          {flyer.channels.length === 0 ? (
            <div className="text-xs text-gray-500">このチラシに紐付いているQRはありません</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {flyer.channels.map((ch) => (
                <div
                  key={ch.id}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ch.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ch.channelType === "diagnosis" ? "診断付き" : "リンク型"}
                      <span className="ml-2">
                        QRスキャン:{" "}
                        <span className="font-medium text-gray-800">
                          {ch.scans.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={openingChannelId === ch.id}
                    onClick={() => onEditChannel(ch.id)}
                    className="h-7 text-xs"
                  >
                    {openingChannelId === ch.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Pencil className="w-3 h-3 mr-1" />
                        QR編集
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
                掲載方法未設定
              </span>
            )}
            <span className="text-gray-500 whitespace-nowrap">
              配布期間: <span className="text-gray-800 font-medium">{ch.distributionPeriod || "—"}</span>
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

// 5タイル（配布枚数/予算/QRスキャン/QRスキャン率/QRスキャン単価）
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
        label="QRスキャン"
        value={scans.toLocaleString()}
        color="text-blue-600"
      />
      <DetailMetric
        label="QRスキャン率"
        value={qrScanRate !== null ? `${qrScanRate.toFixed(2)}%` : ""}
        color="text-blue-600"
        sub="QRスキャン÷配布枚数"
        missing={qrScanRate === null}
      />
      <DetailMetric
        label="QRスキャン単価"
        value={
          qrScanCost !== null
            ? `¥${qrScanCost.toLocaleString()}`
            : budget === null
            ? ""
            : "—"
        }
        color="text-amber-600"
        sub="予算÷QRスキャン"
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

// サマリーカード用タイル
function SummaryTile({
  label,
  value,
  sub,
  color,
  missing,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  missing?: boolean;
}) {
  const displayValue = missing ? "データ未入力" : value;
  const valueColor = missing ? "text-red-600" : color || "text-gray-800";
  const valueSize = missing ? "text-sm" : "text-xl";
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`${valueSize} font-bold tabular-nums ${valueColor}`}>{displayValue}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}

