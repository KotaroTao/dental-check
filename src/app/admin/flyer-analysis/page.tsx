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
  // ファネル各段階の生カウント
  qrScans: number;          // QRスキャンの瞬間（c/[code]リダイレクトで計測）
  diagnosisStarts: number;  // 診断ページに到達した数（page_view）
  scans: number;            // 実効スキャン数（後方互換）
  completions: number;
  ctaClicks: number;
  // 各種率
  responseRate: number | null;
  diagnosisStartRate: number | null;  // QRスキャン → 診断到達
  completionRate: number | null;
  ctaRate: number | null;
  overallCvRate: number | null;       // QRスキャン → CTAクリック（全体CV率）
  costPerScan: number | null;
  costPerCta: number | null;
  createdAt: string;
}

interface MethodStat {
  method: string;
  count: number;
  totalScans: number;
  totalQrScans: number;
  totalDiagnosisStarts: number;
  totalCompletions: number;
  totalCtaClicks: number;
  avgResponseRate: number | null;
  avgDiagnosisStartRate: number | null;
  avgCompletionRate: number | null;
  avgCtaRate: number | null;
  avgOverallCvRate: number | null;
  avgCostPerScan: number | null;
  avgCostPerCta: number | null;
}

interface AnalysisData {
  channels: ChannelAnalysis[];
  methodStats: MethodStat[];
  period: number;
}

type SortKey =
  | "responseRate"
  | "diagnosisStartRate"
  | "completionRate"
  | "ctaRate"
  | "overallCvRate"
  | "costPerScan"
  | "costPerCta"
  | "scans"
  | "diagnosisStarts"
  | "completions"
  | "ctaClicks";

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
  // 1. POST /api/admin/clinics/[clinicId]/impersonate でその医院の auth_token を発行
  // 2. 別タブで /dashboard/channels/[channelId] を開く（auth_token cookieが効く）
  // → 操作は監査ログに記録される（impersonate API側で実装済み）
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
        // 例: 「1CVコスト（安い順）」で予算未設定のQRを上位に出さない
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

  const methodChartData = data.methodStats
    .filter((m) => m.method !== "未設定")
    .map((m) => ({
      method: m.method,
      反応率: m.avgResponseRate ?? 0,
      診断到達率: m.avgDiagnosisStartRate ?? 0,
      完了率: m.avgCompletionRate ?? 0,
      CTA率: m.avgCtaRate ?? 0,
      全体CV率: m.avgOverallCvRate ?? 0,
    }));

  // ファネルは「診断付きQR」のみを集計対象にする
  // リンク型QRは「診断ページ到達/完了」というステージが存在しないため、
  // 一緒に集計すると完了率が母数を超えるなど、数値がおかしくなる
  const diagnosisChannels = sortedChannels.filter((ch) => ch.channelType === "diagnosis");
  const linkChannels = sortedChannels.filter((ch) => ch.channelType === "link");

  // 診断付きQRのファネル合計
  const totalQrScans = diagnosisChannels.reduce((acc, ch) => acc + ch.qrScans, 0);
  const totalScans = diagnosisChannels.reduce((acc, ch) => acc + ch.scans, 0);
  const totalCompletions = diagnosisChannels.reduce((acc, ch) => acc + ch.completions, 0);
  const totalCtaClicks = diagnosisChannels.reduce((acc, ch) => acc + ch.ctaClicks, 0);
  const totalQuantity = diagnosisChannels.reduce((acc, ch) => acc + (ch.distributionQuantity || 0), 0);
  const totalBudget = diagnosisChannels.reduce((acc, ch) => acc + (ch.budget || 0), 0);

  // リンク型QRサマリー（別カードで表示）
  // リンク型は「スキャン → リダイレクト先（=CTAクリック）」の単純フロー
  const linkTotalScans = linkChannels.reduce((acc, ch) => acc + ch.scans, 0);
  const linkTotalCompletions = linkChannels.reduce((acc, ch) => acc + ch.completions, 0);
  const linkTotalCtaClicks = linkChannels.reduce((acc, ch) => acc + ch.ctaClicks, 0);
  const linkTotalQuantity = linkChannels.reduce((acc, ch) => acc + (ch.distributionQuantity || 0), 0);
  const linkTotalBudget = linkChannels.reduce((acc, ch) => acc + (ch.budget || 0), 0);

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
            {/* days=0 は API 側で「全期間」として扱われる */}
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

      {/* QR掲載方法フィルタ（チップ式・スマホでも横スクロール対応） */}
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

      {/* 診断付きQR と リンク型QR を同じ表示形式で並べる
          → 比較しやすくするため、両方とも QrSummaryCard を使う */}
      {diagnosisChannels.length > 0 && (
        <QrSummaryCard
          variant="diagnosis"
          channelCount={diagnosisChannels.length}
          scans={totalScans}
          qrScans={totalQrScans}
          completions={totalCompletions}
          ctaClicks={totalCtaClicks}
          quantity={totalQuantity}
          budget={totalBudget}
        />
      )}

      {linkChannels.length > 0 && (
        <QrSummaryCard
          variant="link"
          channelCount={linkChannels.length}
          scans={linkTotalScans}
          qrScans={0}
          completions={linkTotalCompletions}
          ctaClicks={linkTotalCtaClicks}
          quantity={linkTotalQuantity}
          budget={linkTotalBudget}
        />
      )}

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
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="反応率" fill="#3B82F6" />
                  <Bar dataKey="診断到達率" fill="#06B6D4" />
                  <Bar dataKey="完了率" fill="#10B981" />
                  <Bar dataKey="CTA率" fill="#8B5CF6" />
                  <Bar dataKey="全体CV率" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR別詳細（PC・モバイル共通カードレイアウト・3行構成） */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            QR別詳細（{sortedChannels.length}件）
          </CardTitle>
          {/* 並び替え（旧テーブルのソートヘッダの代わり） */}
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
              <option value="completions:desc">診断完了数（多い順）</option>
              <option value="ctaClicks:desc">CTAクリック数（多い順）</option>
              <option value="responseRate:desc">配布反応率（高い順）</option>
              <option value="completionRate:desc">診断完了率（高い順）</option>
              <option value="overallCvRate:desc">全体CV率（高い順）</option>
              <option value="costPerCta:asc">1CVコスト（安い順）</option>
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
// 構成は3つの横ブロックに分かれる:
//   1段目: 写真(表/裏) + クリニック + QRコード名 + 掲載方法 + 予算 + 配布期間
//          + 効果判定バッジ + 「QRを編集」ボタン
//   2段目: 配布枚数 / QRスキャン / 診断完了 / CTAクリック (生カウント)
//   3段目: 配布反応率 / 診断完了率 / 全体CV率 / 1CVコスト (指標)
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
        {/* 写真(表・裏) */}
        <div className="flex gap-1 shrink-0">
          <ThumbnailImage url={ch.imageUrl} alt="表" onClick={onPreviewImage} />
          <ThumbnailImage url={ch.imageUrl2} alt="裏" onClick={onPreviewImage} />
        </div>

        {/* クリニック + QRコード名 + バッジ群 */}
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
              予算: <span className="text-gray-800 font-medium">
                {ch.budget !== null ? `¥${ch.budget.toLocaleString()}` : "—"}
              </span>
            </span>
            <span className="text-gray-500 whitespace-nowrap">
              配布期間: <span className="text-gray-800 font-medium">
                {ch.distributionPeriod || "—"}
              </span>
            </span>
          </div>
        </div>

        {/* 編集ボタン（効果判定バッジは表示しない） */}
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

      {/* 2段目: 生カウント4タイル（配布枚数 / QRスキャン / 診断完了 / CTAクリック）
          ─ 診断完了とCTAクリックはリンク型では「-」を表示する */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
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
          label="QRスキャン"
          value={ch.scans.toLocaleString()}
          warn={ch.qrScans === 0 && ch.diagnosisStarts > 0}
        />
        <DetailMetric
          label="診断完了"
          value={ch.channelType === "link" ? "-" : ch.completions.toLocaleString()}
        />
        <DetailMetric
          label="CTAクリック"
          value={ch.channelType === "link" ? "-" : ch.ctaClicks.toLocaleString()}
        />
      </div>

      {/* 3段目: 指標4タイル（QR読込率 / QR読込単価 / CTA単価 / CTAクリック率）
          ─ 必要な元データ（配布枚数 or 予算）が未入力なら「データ未入力」を赤字表示
          ─ CTA系の指標はリンク型では「-」 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {/* QR読込率 = QRスキャン ÷ 配布枚数 */}
        <DetailMetric
          label="QR読込率"
          value={
            ch.distributionQuantity && ch.distributionQuantity > 0
              ? `${(Math.round((ch.scans / ch.distributionQuantity) * 10000) / 100).toFixed(2)}%`
              : ""
          }
          color="text-blue-600"
          sub="QRスキャン÷配布枚数"
          missing={!ch.distributionQuantity || ch.distributionQuantity <= 0}
        />
        {/* QR読込単価 = 予算 ÷ QRスキャン */}
        <DetailMetric
          label="QR読込単価"
          value={
            ch.budget !== null && ch.scans > 0
              ? `¥${Math.round(ch.budget / ch.scans).toLocaleString()}`
              : ch.budget !== null
              ? "—"
              : ""
          }
          color="text-gray-700"
          sub="予算÷QRスキャン"
          missing={ch.budget === null}
        />
        {/* CTA単価 = 予算 ÷ CTAクリック（リンク型は対象外） */}
        <DetailMetric
          label="CTA単価"
          value={
            ch.channelType === "link"
              ? "-"
              : ch.budget !== null && ch.ctaClicks > 0
              ? `¥${Math.round(ch.budget / ch.ctaClicks).toLocaleString()}`
              : ch.budget !== null
              ? "—"
              : ""
          }
          color="text-gray-700"
          sub={ch.channelType === "link" ? "対象外" : "予算÷CTAクリック"}
          missing={ch.channelType !== "link" && ch.budget === null}
        />
        {/* CTAクリック率 = 診断完了 ÷ CTAクリック（リンク型は対象外） */}
        <DetailMetric
          label="CTAクリック率"
          value={
            ch.channelType === "link"
              ? "-"
              : ch.ctaClicks > 0
              ? `${(Math.round((ch.completions / ch.ctaClicks) * 1000) / 10).toFixed(1)}%`
              : "—"
          }
          color="text-amber-600"
          sub={ch.channelType === "link" ? "対象外" : "診断完了÷CTAクリック"}
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

// 各タイル（ラベル+大きい数値+補足）。QR別詳細の2段目・3段目で共通利用
// missing=true のときは「データ未入力」を赤色で目立たせる
function DetailMetric({
  label,
  value,
  color,
  warn,
  sub,
  missing,
}: {
  label: string;
  value: string;
  color?: string;
  warn?: boolean;
  sub?: string;
  missing?: boolean;
}) {
  // missing なら value を強制的に「データ未入力」赤字に差し替え
  const displayValue = missing ? "データ未入力" : value;
  const valueColor = missing ? "text-red-600" : color || "text-gray-800";
  const valueSize = missing ? "text-xs" : "text-base";
  return (
    <div className="bg-gray-50 rounded px-3 py-2">
      <div className="text-[11px] text-gray-500 whitespace-nowrap">{label}</div>
      <div className={`${valueSize} font-bold tabular-nums whitespace-nowrap ${valueColor}`}>
        {displayValue}
        {warn && !missing && (
          <span
            className="ml-0.5 text-[10px] text-amber-600"
            title="QRスキャン直接計測前のデータ"
          >
            *
          </span>
        )}
      </div>
      {sub && <div className="text-[10px] text-gray-400 whitespace-nowrap">{sub}</div>}
    </div>
  );
}

// 診断付き/リンク型 共通サマリーカード
// 両者を「同じ並びのタイル」で見比べられるようにし、リンク型では
// 該当しない指標（診断完了・CTA関連）は「-」として明示する。
//
// 表示構成:
//   上段4タイル: 配布枚数 / QRスキャン / 診断完了 / CTAクリック（生カウント）
//   下段4タイル: QR読込率 / QR読込単価 / CTA単価 / CTAクリック率（指標）
function QrSummaryCard({
  variant,
  channelCount,
  scans,
  qrScans,
  completions,
  ctaClicks,
  quantity,
  budget,
}: {
  variant: "diagnosis" | "link";
  channelCount: number;
  scans: number;
  qrScans: number;
  completions: number;
  ctaClicks: number;
  quantity: number;
  budget: number;
}) {
  const isLink = variant === "link";

  // qr_scan未計測期間の警告（診断型のみ。リンク型はctaClicksフォールバックなので警告不要）
  const isLegacy = !isLink && qrScans === 0 && scans > 0;

  // 各指標の計算
  // QR読込率 = QRスキャン÷配布枚数（配布枚数が未入力ならデータ未入力）
  const qrReadRateMissing = quantity <= 0;
  const qrReadRate = !qrReadRateMissing ? (scans / quantity) * 100 : null;

  // QR読込単価 = 予算÷QRスキャン（予算が未入力ならデータ未入力）
  const qrCostMissing = budget <= 0;
  const qrCost = !qrCostMissing && scans > 0 ? Math.round(budget / scans) : null;

  // CTA単価 = 予算÷CTAクリック（リンク型は対象外。予算が未入力ならデータ未入力）
  const ctaCostMissing = !isLink && budget <= 0;
  const ctaCost = !isLink && !ctaCostMissing && ctaClicks > 0 ? Math.round(budget / ctaClicks) : null;

  // CTAクリック率 = 診断完了÷CTAクリック（リンク型は対象外）
  const ctaClickRate = !isLink && ctaClicks > 0 ? (completions / ctaClicks) * 100 : null;

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
        {isLink ? (
          <div className="mb-3 text-[11px] text-gray-500">
            ℹ️ リンク型は診断を介さず直接URLへ飛ばすため、「診断完了」「CTAクリック」関連の指標は対象外です。
          </div>
        ) : (
          <div className="mb-3 text-[11px] text-gray-500 bg-blue-50/50 border border-blue-100 rounded px-3 py-2">
            ℹ️ 診断付きQRは「配布 → QRスキャン → 診断完了 → CTAクリック」のファネルで計測します。
          </div>
        )}
        {isLegacy && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ この期間はQRスキャン直接計測の前のデータです。「QRスキャン」は診断ページ到達数で代用しています。
          </div>
        )}

        {/* 上段: 生カウント4タイル（配布枚数 / QRスキャン / 診断完了 / CTAクリック）
            ─ 診断完了とCTAクリックはリンク型では「-」を表示 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
          <SummaryTile
            label="配布枚数"
            value={quantity > 0 ? `${quantity.toLocaleString()}枚` : ""}
            missing={quantity <= 0}
          />
          <SummaryTile
            label="QRスキャン"
            value={scans.toLocaleString()}
            color="text-blue-600"
          />
          <SummaryTile
            label="診断完了"
            value={isLink ? "-" : completions.toLocaleString()}
            color="text-emerald-600"
          />
          <SummaryTile
            label="CTAクリック"
            value={isLink ? "-" : ctaClicks.toLocaleString()}
            color="text-purple-600"
          />
        </div>

        {/* 下段: 指標4タイル（QR読込率 / QR読込単価 / CTA単価 / CTAクリック率）
            ─ 元データ未入力なら「データ未入力」を赤字表示 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <SummaryTile
            label="QR読込率"
            value={qrReadRate !== null ? `${qrReadRate.toFixed(2)}%` : ""}
            sub="QRスキャン÷配布枚数"
            color="text-blue-600"
            missing={qrReadRateMissing}
          />
          <SummaryTile
            label="QR読込単価"
            value={
              qrCost !== null
                ? `¥${qrCost.toLocaleString()}`
                : qrCostMissing
                ? ""
                : "—"
            }
            sub="予算÷QRスキャン"
            color="text-gray-700"
            missing={qrCostMissing}
          />
          <SummaryTile
            label="CTA単価"
            value={
              isLink
                ? "-"
                : ctaCost !== null
                ? `¥${ctaCost.toLocaleString()}`
                : ctaCostMissing
                ? ""
                : "—"
            }
            sub={isLink ? "対象外" : "予算÷CTAクリック"}
            color="text-gray-700"
            missing={ctaCostMissing}
          />
          <SummaryTile
            label="CTAクリック率"
            value={
              isLink
                ? "-"
                : ctaClickRate !== null
                ? `${ctaClickRate.toFixed(1)}%`
                : "—"
            }
            sub={isLink ? "対象外" : "診断完了÷CTAクリック"}
            color="text-amber-600"
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
