"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Image as ImageIcon,
  TrendingUp,
  Eye,
  Link2,
  Pencil,
  ExternalLink,
  Loader2,
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

interface ChannelAnalysis {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  name: string;
  channelType: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  distributionPeriod: string | null;
  budget: number | null;
  // 生のカウント
  qrScans: number;          // 真のQRスキャン数（c/[code]リダイレクトで計測）
  scans: number;            // 実効スキャン数（qr_scan が無ければ page_view にフォールバック）
  // 算出指標
  qrScanRate: number | null;  // QRスキャン÷配布枚数（%）
  qrScanCost: number | null;  // 予算÷QRスキャン（円）
  createdAt: string;
}

interface MethodStat {
  method: string;
  count: number;
  totalScans: number;
  totalQrScans: number;
  totalQuantity: number;
  totalBudget: number;
  avgQrScanRate: number | null;
  avgQrScanCost: number | null;
}

interface AnalysisData {
  channels: ChannelAnalysis[];
  methodStats: MethodStat[];
  period: number;
}

type SortKey = "scans" | "qrScanRate" | "qrScanCost";

export default function FlyerAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // 期間フィルタ: デフォルトは365日。0 は「全期間」を表す特殊値
  const [period, setPeriod] = useState(365);
  const [methodFilter, setMethodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scans");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // 各QRの編集ページを開く（管理者→医院になりすまし→新タブで遷移）
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

  const sortedChannels = data?.channels
    ? [...data.channels].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        // データなし（null/undefined）は昇順・降順に関わらず常に末尾へ
        const aIsNull = aVal === null || aVal === undefined;
        const bIsNull = bVal === null || bVal === undefined;
        if (aIsNull && bIsNull) return 0;
        if (aIsNull) return 1;
        if (bIsNull) return -1;
        return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
    );
  }

  if (!data) return null;

  // 配布方法別チャート用データ。QRスキャン率(%) と QRスキャン単価(円) を併せて見せる
  const methodChartData = data.methodStats
    .filter((m) => m.method !== "未設定")
    .map((m) => ({
      method: m.method,
      QRスキャン率: m.avgQrScanRate ?? 0,
      QRスキャン単価: m.avgQrScanCost ?? 0,
    }));

  // 診断付きQRとリンク型QRはサマリー上は別カードで表示するが、
  // 表示する指標（5項目）は両者で共通
  const diagnosisChannels = sortedChannels.filter((ch) => ch.channelType === "diagnosis");
  const linkChannels = sortedChannels.filter((ch) => ch.channelType === "link");

  const sumChannels = (chs: ChannelAnalysis[]) => ({
    qrScans: chs.reduce((acc, ch) => acc + ch.qrScans, 0),
    scans: chs.reduce((acc, ch) => acc + ch.scans, 0),
    quantity: chs.reduce((acc, ch) => acc + (ch.distributionQuantity || 0), 0),
    budget: chs.reduce((acc, ch) => acc + (ch.budget || 0), 0),
  });

  const diagnosisTotals = sumChannels(diagnosisChannels);
  const linkTotals = sumChannels(linkChannels);

  // QR掲載方法の選択肢（チップ式フィルタで使用）
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
      {/* ヘッダー（タイトル + 期間フィルタ + リフレッシュ） */}
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

      {/* 診断付きQR と リンク型QR を並べる（指標は両者共通） */}
      {diagnosisChannels.length > 0 && (
        <QrSummaryCard
          variant="diagnosis"
          channelCount={diagnosisChannels.length}
          qrScans={diagnosisTotals.qrScans}
          scans={diagnosisTotals.scans}
          quantity={diagnosisTotals.quantity}
          budget={diagnosisTotals.budget}
        />
      )}

      {linkChannels.length > 0 && (
        <QrSummaryCard
          variant="link"
          channelCount={linkChannels.length}
          qrScans={linkTotals.qrScans}
          scans={linkTotals.scans}
          quantity={linkTotals.quantity}
          budget={linkTotals.budget}
        />
      )}

      {/* 配布方法別比較チャート（QRスキャン率と単価の2軸で比較） */}
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
                  {/* 左Y軸: QRスキャン率(%)。右Y軸: QRスキャン単価(¥) */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    unit="%"
                  />
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

      {/* QR別詳細 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            QR別詳細（{sortedChannels.length}件）
          </CardTitle>
          {/* 並び替え */}
          <div className="flex items-center gap-2 text-sm">
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sortedChannels.length === 0 ? (
              <div className="py-12 text-center text-gray-500">データがありません</div>
            ) : (
              sortedChannels.map((ch) => (
                <QrDetailRow
                  key={ch.id}
                  ch={ch}
                  onPreviewImage={setPreviewImage}
                  onEdit={handleOpenChannelEditor}
                  isOpening={openingChannelId === ch.id}
                />
              ))
            )}
          </div>
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


// QR別詳細の1行（PC・モバイル共通）
// 構成は2つの横ブロックに分かれる:
//   1段目: 写真(表/裏) + クリニック + QRコード名 + 掲載方法 + 配布期間 + 「QRを編集」ボタン
//   2段目: 配布枚数 / 予算 / QRスキャン / QRスキャン率 / QRスキャン単価（5タイル）
function QrDetailRow({
  ch,
  onPreviewImage,
  onEdit,
  isOpening,
}: {
  ch: ChannelAnalysis;
  onPreviewImage: (url: string) => void;
  onEdit: (clinicId: string, channelId: string) => void;
  isOpening: boolean;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 space-y-3">
      {/* 1段目: メタ情報 */}
      <div className="flex items-start gap-3">
        <div className="flex gap-1 shrink-0">
          <ThumbnailImage url={ch.imageUrl} alt="表" onClick={onPreviewImage} />
          <ThumbnailImage url={ch.imageUrl2} alt="裏" onClick={onPreviewImage} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 truncate">{ch.clinicName}</div>
          <div className="text-sm sm:text-base font-medium truncate">{ch.name}</div>
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
              配布期間: <span className="text-gray-800 font-medium">
                {ch.distributionPeriod || "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button
            size="sm"
            disabled={isOpening}
            onClick={() => onEdit(ch.clinicId, ch.id)}
            title="医院になりすましてQR編集ページを別タブで開く"
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
                QRを編集
                <ExternalLink className="w-3 h-3 opacity-70" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2段目: 5タイル
          配布枚数 / 予算 / QRスキャン / QRスキャン率 / QRスキャン単価
          ─ 元データ（配布枚数 or 予算）が未入力なら「データ未入力」を赤字表示 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <DetailMetric
          label="配布枚数"
          value={
            ch.distributionQuantity !== null
              ? `${ch.distributionQuantity.toLocaleString()}枚`
              : ""
          }
          missing={ch.distributionQuantity === null}
        />
        <DetailMetric
          label="予算"
          value={ch.budget !== null ? `¥${ch.budget.toLocaleString()}` : ""}
          missing={ch.budget === null}
        />
        <DetailMetric
          label="QRスキャン"
          value={ch.scans.toLocaleString()}
          color="text-blue-600"
        />
        <DetailMetric
          label="QRスキャン率"
          value={
            ch.qrScanRate !== null
              ? `${ch.qrScanRate.toFixed(2)}%`
              : ""
          }
          color="text-blue-600"
          sub="QRスキャン÷配布枚数"
          missing={ch.qrScanRate === null}
        />
        <DetailMetric
          label="QRスキャン単価"
          value={
            ch.qrScanCost !== null
              ? `¥${ch.qrScanCost.toLocaleString()}`
              : ch.budget === null
              ? ""
              : "—"
          }
          color="text-amber-600"
          sub="予算÷QRスキャン"
          missing={ch.budget === null}
        />
      </div>
    </div>
  );
}

// 表/裏の画像サムネイル（クリックで拡大プレビュー）
function ThumbnailImage({
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

// 各タイル（ラベル+大きい数値+補足）
// missing=true のときは「データ未入力」を赤色で目立たせる
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

// 診断付き/リンク型 共通サマリーカード
// 表示する5タイルは両者で同じ。説明文だけ少し変える。
function QrSummaryCard({
  variant,
  channelCount,
  qrScans,
  scans,
  quantity,
  budget,
}: {
  variant: "diagnosis" | "link";
  channelCount: number;
  qrScans: number;
  scans: number;
  quantity: number;
  budget: number;
}) {
  const isLink = variant === "link";

  // qr_scan未計測期間の警告（診断型のみ。リンク型は qr_scan が必ず計測されている前提）
  const isLegacy = !isLink && qrScans === 0 && scans > 0;

  // 各指標の計算
  // QRスキャン率 = QRスキャン÷配布枚数（配布枚数が未入力ならデータ未入力）
  const qrScanRateMissing = quantity <= 0;
  const qrScanRate = !qrScanRateMissing ? (scans / quantity) * 100 : null;

  // QRスキャン単価 = 予算÷QRスキャン（予算が未入力ならデータ未入力）
  const qrScanCostMissing = budget <= 0;
  const qrScanCost = !qrScanCostMissing && scans > 0 ? Math.round(budget / scans) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          {isLink ? <Link2 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          {isLink ? "リンク型QRサマリー" : "診断付きQRサマリー"}
          <span className="ml-auto text-xs text-gray-500 font-normal">{channelCount}件のQRを集計</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLegacy && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ この期間はQRスキャン直接計測の前のデータです。「QRスキャン」は診断ページ到達数で代用しています。
          </div>
        )}

        {/* 5タイル: 配布枚数 / 予算 / QRスキャン / QRスキャン率 / QRスキャン単価 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
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

// サマリータイル（数値1つ + ラベル + 補足）
// missing=true のときは「データ未入力」を赤色で目立たせる
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
