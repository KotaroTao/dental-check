"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ArrowUpDown,
  Image as ImageIcon,
  TrendingUp,
  Megaphone,
  Eye,
  Link2,
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

type EffectivenessTier =
  | "excellent"  // 平均比 +30%以上
  | "good"       // +10〜30%
  | "avg"        // -10〜+10%
  | "below"      // -30〜-10%
  | "poor"       // -30%未満
  | "insufficient"; // サンプル不足/CV未計測

type ConfidenceTier = "high" | "medium" | "low" | "insufficient";

interface ChannelAnalysis {
  id: string;
  clinicName: string;
  clinicSlug: string;
  name: string;
  channelType: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
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
  // 効果判定（API側で計算）
  effectivenessTier: EffectivenessTier;
  confidence: ConfidenceTier;
  benchmarkDeviation: number | null;     // 平均比 % (+25 なら平均より25%良い)
  benchmarkPeerLabel: string;            // 「ポスティング平均」「全社平均」など
  benchmarkPeerCvRate: number | null;    // 比較対象の全体CV率（参考）
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
  globalAvg: {
    overallCvRate: number | null;
    responseRate: number | null;
    sampleScans: number;
  };
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
  | "ctaClicks"
  | "benchmarkDeviation";

// 効果ティアの表示設定（色・ラベル・並び順用の重み）
const TIER_META: Record<
  EffectivenessTier,
  { label: string; color: string; weight: number }
> = {
  excellent:    { label: "優秀",     color: "bg-emerald-100 text-emerald-700 border-emerald-300", weight: 5 },
  good:         { label: "良好",     color: "bg-green-50 text-green-700 border-green-200",       weight: 4 },
  avg:          { label: "平均",     color: "bg-gray-100 text-gray-700 border-gray-300",         weight: 3 },
  below:        { label: "やや不調", color: "bg-amber-50 text-amber-700 border-amber-200",       weight: 2 },
  poor:         { label: "要改善",   color: "bg-rose-50 text-rose-700 border-rose-200",          weight: 1 },
  insufficient: { label: "判定不能", color: "bg-gray-50 text-gray-500 border-gray-200",          weight: 0 },
};

// 信頼度ティアの表示設定
const CONFIDENCE_META: Record<ConfidenceTier, { label: string; stars: string }> = {
  high:         { label: "信頼度: 高（500件以上）",         stars: "★★★" },
  medium:       { label: "信頼度: 中（100〜499件）",        stars: "★★☆" },
  low:          { label: "信頼度: 低（30〜99件）",          stars: "★☆☆" },
  insufficient: { label: "サンプル不足（30件未満）",        stars: "—" },
};

export default function FlyerAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(90);
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedChannels = data?.channels
    ? [...data.channels].sort((a, b) => {
        const aVal = a[sortKey] ?? -Infinity;
        const bVal = b[sortKey] ?? -Infinity;
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
  const totalDiagnosisStarts = diagnosisChannels.reduce((acc, ch) => acc + ch.diagnosisStarts, 0);
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
          <div className="flex gap-1">
            {[30, 90, 180, 365].map((days) => (
              <Button
                key={days}
                variant={period === days ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {days}日
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
          diagnosisStarts={totalDiagnosisStarts}
          completions={totalCompletions}
          ctaClicks={totalCtaClicks}
          quantity={totalQuantity}
          budget={totalBudget}
          globalAvg={data.globalAvg}
        />
      )}

      {linkChannels.length > 0 && (
        <QrSummaryCard
          variant="link"
          channelCount={linkChannels.length}
          scans={linkTotalScans}
          qrScans={0}
          diagnosisStarts={0}
          completions={linkTotalCompletions}
          ctaClicks={linkTotalCtaClicks}
          quantity={linkTotalQuantity}
          budget={linkTotalBudget}
        />
      )}

      {/* 配布方法別サマリーカード */}
      {data.methodStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.methodStats.map((ms) => (
            <Card key={ms.method}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{ms.method}</span>
                  </div>
                  <span className="text-xs text-gray-500">{ms.count}件</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500">配布反応率</div>
                    <div className="text-lg font-bold text-blue-600">
                      {ms.avgResponseRate !== null ? `${ms.avgResponseRate}%` : "-"}
                    </div>
                    <div className="text-[10px] text-gray-400">スキャン÷配布枚数</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">全体CV率</div>
                    <div className="text-lg font-bold text-purple-600">
                      {ms.avgOverallCvRate !== null ? `${ms.avgOverallCvRate}%` : "-"}
                    </div>
                    <div className="text-[10px] text-gray-400">スキャン→CTA</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[11px]">
                  <div>
                    <div className="text-gray-400">診断到達</div>
                    <div className="font-medium text-gray-700">
                      {ms.avgDiagnosisStartRate !== null ? `${ms.avgDiagnosisStartRate}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">完了</div>
                    <div className="font-medium text-gray-700">
                      {ms.avgCompletionRate !== null ? `${ms.avgCompletionRate}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">CTA</div>
                    <div className="font-medium text-gray-700">
                      {ms.avgCtaRate !== null ? `${ms.avgCtaRate}%` : "-"}
                    </div>
                  </div>
                </div>
                {(ms.avgCostPerScan !== null || ms.avgCostPerCta !== null) && (
                  <div className="mt-2 flex justify-around text-center text-xs text-gray-500">
                    {ms.avgCostPerScan !== null && (
                      <div>1スキャン ¥{ms.avgCostPerScan.toLocaleString()}</div>
                    )}
                    {ms.avgCostPerCta !== null && (
                      <div>1CV ¥{ms.avgCostPerCta.toLocaleString()}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* チャネル一覧（lg以上はテーブル、それ以下はカード表示でスマホでも読みやすく） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            チャネル別詳細（{sortedChannels.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* 大きい画面（lg=1024px以上）: テーブル表示 */}
          {/* min-w-[1100px] で各カラムに十分な幅を確保し、画面が狭ければ横スクロール */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">写真</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">クリニック</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">QRコード名</th>
                  <th className="text-left py-3 px-3 font-medium whitespace-nowrap">配布方法</th>
                  <SortHeader label="効果判定" sortKey="benchmarkDeviation" currentKey={sortKey} asc={sortAsc} onClick={handleSort} align="left" />
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">配布枚数</th>
                  <th className="text-right py-3 px-3 font-medium whitespace-nowrap">予算</th>
                  <SortHeader label="スキャン" sortKey="scans" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="診断到達" sortKey="diagnosisStarts" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="完了" sortKey="completions" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="CTA" sortKey="ctaClicks" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="配布反応率" sortKey="responseRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="完了率" sortKey="completionRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="全体CV率" sortKey="overallCvRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="1CVコスト" sortKey="costPerCta" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedChannels.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  sortedChannels.map((ch) => (
                    <tr key={ch.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        {ch.imageUrl ? (
                          <img
                            src={ch.imageUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => setPreviewImage(ch.imageUrl)}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{ch.clinicName}</td>
                      <td className="py-2 px-3 font-medium whitespace-nowrap">{ch.name}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {ch.distributionMethod ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 whitespace-nowrap">
                            {ch.distributionMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <EffectivenessBadge ch={ch} />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.distributionQuantity !== null ? ch.distributionQuantity.toLocaleString() : "-"}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.budget !== null ? `¥${ch.budget.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium whitespace-nowrap">
                        {ch.scans.toLocaleString()}
                        {ch.qrScans === 0 && ch.diagnosisStarts > 0 && (
                          <span
                            className="ml-1 text-[10px] text-amber-600"
                            title="この期間はQRスキャン直接計測の前のデータのため、診断ページ到達数を代用しています"
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.channelType === "link" ? (
                          <span className="text-gray-400" title="リンク型は診断ページがありません">—</span>
                        ) : (
                          ch.diagnosisStarts.toLocaleString()
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.completions.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.ctaClicks.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        <RateCell value={ch.responseRate} suffix="%" />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        <RateCell value={ch.completionRate} suffix="%" />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        <RateCell value={ch.overallCvRate} suffix="%" />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {ch.costPerCta !== null ? `¥${ch.costPerCta.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 小さい画面（lg未満=タブレット/スマホ）: カード表示 */}
          <div className="lg:hidden divide-y">
            {sortedChannels.length === 0 ? (
              <div className="py-12 text-center text-gray-500">データがありません</div>
            ) : (
              sortedChannels.map((ch) => (
                <ChannelCard key={ch.id} ch={ch} onPreviewImage={setPreviewImage} />
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

// ソート可能なヘッダー
function SortHeader({
  label,
  sortKey: key,
  currentKey,
  asc,
  onClick,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = currentKey === key;
  // Tailwindは文字列補間できないので明示的に切り替える
  const alignClass = align === "left" ? "text-left" : "text-right";
  return (
    <th
      className={`${alignClass} py-3 px-3 font-medium cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap`}
      onClick={() => onClick(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
        {isActive && (
          <span className="text-xs text-blue-600">{asc ? "↑" : "↓"}</span>
        )}
      </span>
    </th>
  );
}

// 率表示セル
function RateCell({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  return (
    <span className={value > 0 ? "text-gray-900" : "text-gray-400"}>
      {value}{suffix}
    </span>
  );
}

// 効果バッジ: 「優秀/良好/平均/やや不調/要改善/判定不能」を色付きで表示
// 信頼度（★）と平均比（+25%など）も併記し、医院ごとの判断材料を1セルに集約
function EffectivenessBadge({ ch }: { ch: ChannelAnalysis }) {
  const meta = TIER_META[ch.effectivenessTier];
  const conf = CONFIDENCE_META[ch.confidence];
  const tooltip =
    ch.effectivenessTier === "insufficient"
      ? `データが少ないため判定できません（${conf.label}）`
      : `${ch.benchmarkPeerLabel}比 ${ch.benchmarkDeviation! >= 0 ? "+" : ""}${ch.benchmarkDeviation}% / ${conf.label}\n` +
        `比較対象の全体CV率: ${ch.benchmarkPeerCvRate ?? "-"}%`;

  return (
    <div className="flex flex-col gap-0.5" title={tooltip}>
      <span
        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color} whitespace-nowrap w-fit`}
      >
        {meta.label}
        {ch.benchmarkDeviation !== null && ch.effectivenessTier !== "insufficient" && (
          <span className="ml-1 tabular-nums">
            {ch.benchmarkDeviation >= 0 ? "+" : ""}
            {ch.benchmarkDeviation}%
          </span>
        )}
      </span>
      <span className="text-[10px] text-gray-500 whitespace-nowrap pl-1">
        {conf.stars} {ch.scans}件
      </span>
    </div>
  );
}

// スマホ・タブレット向けのチャネルカード
// → 横長テーブルが小画面で潰れて文字が縦書きになる問題を回避
function ChannelCard({
  ch,
  onPreviewImage,
}: {
  ch: ChannelAnalysis;
  onPreviewImage: (url: string) => void;
}) {
  return (
    <div className="p-4 hover:bg-gray-50">
      {/* 効果判定バッジ（最上部に大きく表示） */}
      <div className="mb-2">
        <EffectivenessBadge ch={ch} />
      </div>
      {/* 上段: 画像 + 医院名 + QRコード名 */}
      <div className="flex items-start gap-3 mb-3">
        {ch.imageUrl ? (
          <img
            src={ch.imageUrl}
            alt=""
            className="w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 shrink-0"
            onClick={() => onPreviewImage(ch.imageUrl!)}
          />
        ) : (
          <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5 text-gray-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 truncate">{ch.clinicName}</div>
          <div className="text-sm font-medium truncate">{ch.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {ch.distributionMethod && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 whitespace-nowrap">
                {ch.distributionMethod}
              </span>
            )}
            {ch.distributionQuantity !== null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 whitespace-nowrap">
                配布 {ch.distributionQuantity.toLocaleString()}枚
              </span>
            )}
            {ch.budget !== null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 whitespace-nowrap">
                ¥{ch.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 中段: ファネル各段階（診断型は4段階、リンク型は3段階） */}
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        <CardMetric
          label="スキャン"
          value={ch.scans.toLocaleString()}
          warn={ch.qrScans === 0 && ch.diagnosisStarts > 0}
        />
        <CardMetric
          label="診断到達"
          value={ch.channelType === "link" ? "—" : ch.diagnosisStarts.toLocaleString()}
        />
        <CardMetric label="完了" value={ch.completions.toLocaleString()} />
        <CardMetric label="CTA" value={ch.ctaClicks.toLocaleString()} />
      </div>

      {/* 下段: 主要指標 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <CardMetric
          label="配布反応率"
          value={ch.responseRate !== null ? `${ch.responseRate}%` : "-"}
          color="text-blue-600"
        />
        <CardMetric
          label="完了率"
          value={ch.completionRate !== null ? `${ch.completionRate}%` : "-"}
          color="text-emerald-600"
        />
        <CardMetric
          label="全体CV率"
          value={ch.overallCvRate !== null ? `${ch.overallCvRate}%` : "-"}
          color="text-amber-600"
        />
        <CardMetric
          label="1CVコスト"
          value={ch.costPerCta !== null ? `¥${ch.costPerCta.toLocaleString()}` : "-"}
        />
      </div>
    </div>
  );
}

function CardMetric({
  label,
  value,
  color,
  warn,
}: {
  label: string;
  value: string;
  color?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1.5">
      <div className="text-[10px] text-gray-500 whitespace-nowrap">{label}</div>
      <div className={`text-sm font-semibold whitespace-nowrap ${color || "text-gray-800"}`}>
        {value}
        {warn && (
          <span
            className="ml-0.5 text-[10px] text-amber-600"
            title="QRスキャン直接計測前のデータ"
          >
            *
          </span>
        )}
      </div>
    </div>
  );
}

// 診断付き/リンク型 共通サマリーカード
// 両者を「同じ並びのタイル」で見比べられるようにし、リンク型では
// 該当しない指標（診断到達・完了率）は「—」として明示する。
//
// 表示構成:
//   上段4タイル: スキャン / 診断到達 / 完了 / CTA（生カウント）
//   下段4タイル: 配布反応率 / 完了率 / 全体CV率 / 1CVコスト（指標）
function QrSummaryCard({
  variant,
  channelCount,
  scans,
  qrScans,
  diagnosisStarts,
  completions,
  ctaClicks,
  quantity,
  budget,
  globalAvg,
}: {
  variant: "diagnosis" | "link";
  channelCount: number;
  scans: number;
  qrScans: number;
  diagnosisStarts: number;
  completions: number;
  ctaClicks: number;
  quantity: number;
  budget: number;
  globalAvg?: { overallCvRate: number | null; responseRate: number | null; sampleScans: number };
}) {
  const isLink = variant === "link";

  // 共通指標
  const responseRate = quantity > 0 ? (scans / quantity) * 100 : null;
  const overallCvRate = scans > 0 ? (ctaClicks / scans) * 100 : null;
  const costPerCv = budget > 0 && ctaClicks > 0 ? Math.round(budget / ctaClicks) : null;
  // 完了率（診断のみ）: 診断到達→完了
  const completionRate = !isLink && diagnosisStarts > 0 ? (completions / diagnosisStarts) * 100 : null;

  // qr_scan未計測期間の警告（診断型のみ。リンク型はctaClicksフォールバックなので警告不要）
  const isLegacy = !isLink && qrScans === 0 && scans > 0;

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
            ℹ️ リンク型は診断を介さず直接URLへ飛ばすため、「診断ページ到達」「完了率」は対象外です。
          </div>
        ) : (
          <div className="mb-3 text-[11px] text-gray-500 bg-blue-50/50 border border-blue-100 rounded px-3 py-2">
            ℹ️ 診断付きQRは「スキャン → 診断ページ到達 → 診断完了 → CTAクリック」の4段階で計測します。
          </div>
        )}
        {isLegacy && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ この期間はQRスキャン直接計測の前のデータです。「スキャン」は診断ページ到達数で代用しています。
          </div>
        )}

        {/* 上段: 生カウント4タイル */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
          <SummaryTile
            label="QRスキャン"
            value={scans.toLocaleString()}
            sub={quantity > 0 ? `配布${quantity.toLocaleString()}枚` : undefined}
            color="text-blue-600"
          />
          <SummaryTile
            label="診断ページ到達"
            value={isLink ? "—" : diagnosisStarts.toLocaleString()}
            sub={isLink ? "対象外" : undefined}
            color="text-cyan-600"
          />
          <SummaryTile
            label="診断完了"
            value={completions.toLocaleString()}
            color="text-emerald-600"
          />
          <SummaryTile
            label="CTAクリック"
            value={ctaClicks.toLocaleString()}
            color="text-purple-600"
          />
        </div>

        {/* 下段: 指標4タイル */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <SummaryTile
            label="配布反応率"
            value={responseRate !== null ? `${responseRate.toFixed(2)}%` : "—"}
            sub="スキャン÷配布枚数"
            color="text-blue-600"
          />
          <SummaryTile
            label="完了率"
            value={completionRate !== null ? `${completionRate.toFixed(1)}%` : "—"}
            sub={isLink ? "対象外" : "診断到達→完了"}
            color="text-emerald-600"
          />
          <SummaryTile
            label="全体CV率"
            value={overallCvRate !== null ? `${overallCvRate.toFixed(2)}%` : "—"}
            sub="スキャン→CTA"
            color="text-amber-600"
          />
          <SummaryTile
            label="1CVコスト"
            value={costPerCv !== null ? `¥${costPerCv.toLocaleString()}` : "—"}
            sub="予算÷CTA"
            color="text-gray-700"
          />
        </div>

        {!isLink && globalAvg && globalAvg.overallCvRate !== null && (
          <div className="mt-3 text-[11px] text-gray-500">
            ベンチマーク基準: 全社平均CV率 <span className="font-semibold text-gray-700">{globalAvg.overallCvRate}%</span>
            （サンプル {globalAvg.sampleScans.toLocaleString()}件）
            ・各QRの「効果判定」はこの平均または同掲載方法平均との比較で算出されています
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// サマリータイル（数値1つ + ラベル + 補足）
function SummaryTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color || "text-gray-800"}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
