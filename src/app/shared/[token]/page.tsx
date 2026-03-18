"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  QrCode,
  Target,
  Loader2,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const CTA_TYPE_NAMES: Record<string, string> = {
  booking: "予約",
  phone: "電話",
  line: "LINE",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  x: "X",
  google_maps: "マップ",
  clinic_page: "医院ページ",
  clinic_homepage: "ホームページ",
  direct_link: "直リンク",
};

const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "直近7日" },
  { value: "month", label: "直近30日" },
  { value: "all", label: "全期間" },
];

interface SharedChannel {
  id: string;
  name: string;
  channelType: string;
  diagnosisTypeSlug: string | null;
  budget: number | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  accessCount: number;
  ctaCount: number;
  ctaRate: number;
  costPerAccess: number | null;
}

interface SharedStats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaRate: number;
  ctaByType: Record<string, number>;
  categoryStats: Record<string, { count: number; ctaCount: number; ctaRate: number }>;
  genderByType: Record<string, number>;
  ageRanges: Record<string, number>;
}

interface ClinicInfo {
  name: string;
  logoUrl: string | null;
  mainColor: string;
}

interface DailyAccess {
  date: string;
  count: number;
}

interface RegionData {
  region: string;
  count: number;
}

interface ScanRecord {
  scannedAt: string;
  channelName: string;
  area: string | null;
}

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [stats, setStats] = useState<SharedStats | null>(null);
  const [channels, setChannels] = useState<SharedChannel[]>([]);
  const [dailyAccess, setDailyAccess] = useState<DailyAccess[]>([]);
  const [topRegions, setTopRegions] = useState<RegionData[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [showAllScans, setShowAllScans] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({ period });
      if (selectedChannelIds.length > 0) {
        queryParams.set("channelIds", selectedChannelIds.join(","));
      }

      const response = await fetch(`/api/shared/${token}?${queryParams}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("この共有リンクは無効です。リンクが削除されたか、期限切れの可能性があります。");
        } else {
          setError("データの取得に失敗しました");
        }
        return;
      }

      const data = await response.json();
      setClinic(data.clinic);
      setStats(data.stats);
      setChannels(data.channels);
      setDailyAccess(data.dailyAccess || []);
      setTopRegions(data.topRegions || []);
      setScanHistory(data.scanHistory || []);
      setGeneratedAt(data.generatedAt || "");
      setShowAllScans(false);
      setError("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [token, period, selectedChannelIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 初回読み込み時にすべてのチャンネルを選択状態にする
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (!isInitialized && channels.length > 0) {
      setSelectedChannelIds(channels.map((c) => c.id));
      setIsInitialized(true);
    }
  }, [channels, isInitialized]);

  if (isLoading && !clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">レポートを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800 mb-2">共有レポート</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const mainColor = clinic?.mainColor || "#2563eb";
  const genderTotal = stats
    ? (stats.genderByType.male || 0) + (stats.genderByType.female || 0) + (stats.genderByType.other || 0)
    : 0;

  // 日別グラフのデータをフォーマット
  const chartData = dailyAccess.map((d) => ({
    ...d,
    label: `${parseInt(d.date.split("-")[1])}/${parseInt(d.date.split("-")[2])}`,
  }));

  // エリアグラフ用の色
  const REGION_COLORS = [
    "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe",
    "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {clinic?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clinic.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: mainColor }}
                >
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-gray-800">{clinic?.name}</h1>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <FileText className="w-3 h-3" />
                  QRコード効果レポート
                </div>
              </div>
            </div>
            {generatedAt && (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(generatedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                時点
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* 期間フィルター */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">期間:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === opt.value
                  ? "text-white shadow-sm"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
              style={period === opt.value ? { backgroundColor: mainColor } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ===== サマリーカード ===== */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SummaryCard
              label="QR読込数"
              value={stats.accessCount}
              icon={<QrCode className="w-5 h-5" />}
              color={mainColor}
            />
            <SummaryCard
              label="診断完了数"
              value={stats.completedCount}
              icon={<Users className="w-5 h-5" />}
              color="#10b981"
            />
            <SummaryCard
              label="CTAアクション数"
              value={stats.ctaCount}
              icon={<Target className="w-5 h-5" />}
              color="#f59e0b"
            />
            <SummaryCard
              label="CTA率"
              value={stats.ctaRate}
              suffix="%"
              icon={<TrendingUp className="w-5 h-5" />}
              color="#8b5cf6"
            />
          </div>
        )}

        {/* ===== コンバージョンファネル ===== */}
        {stats && stats.accessCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: mainColor }} />
              コンバージョンファネル
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              QRコードを読み込んだ人が、どれだけ診断を完了し、予約などのアクションにつながったかの流れです
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-4 py-4">
              <FunnelStep
                label="QR読込"
                count={stats.accessCount}
                percentage={100}
                color={mainColor}
              />
              <ArrowRight className="w-5 h-5 text-gray-300 shrink-0" />
              <FunnelStep
                label="診断完了"
                count={stats.completedCount}
                percentage={stats.completionRate}
                color="#10b981"
              />
              <ArrowRight className="w-5 h-5 text-gray-300 shrink-0" />
              <FunnelStep
                label="CTA"
                count={stats.ctaCount}
                percentage={stats.ctaRate}
                color="#f59e0b"
              />
            </div>
          </div>
        )}

        {/* ===== 日別アクセス推移グラフ ===== */}
        {chartData.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: mainColor }} />
              日別アクセス推移
            </h2>
            <p className="text-xs text-gray-400 mb-4">QRコードが読み込まれた回数の日別推移です</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any) => [`${value}件`, "読込数"]) as any}
                    labelFormatter={(label: string) => `${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={mainColor}
                    strokeWidth={2.5}
                    dot={{ fill: mainColor, r: 3 }}
                    activeDot={{ r: 5, fill: mainColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ===== QRコード別効果 ===== */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <QrCode className="w-4 h-4" style={{ color: mainColor }} />
              QRコード別 効果
            </h2>
            {channels.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">QRコードがありません</p>
            ) : (
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div key={ch.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-gray-800">{ch.name}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {ch.channelType === "diagnosis" ? "診断型" : "リンク型"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-700">{ch.accessCount.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">読込数</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-700">{ch.ctaCount.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">CTA数</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: mainColor }}>{ch.ctaRate}%</div>
                        <div className="text-xs text-gray-400">CTA率</div>
                      </div>
                    </div>
                    {(ch.budget || ch.costPerAccess) && (
                      <div className="mt-2 pt-2 border-t flex flex-wrap gap-3 text-xs text-gray-500">
                        {ch.budget != null && (
                          <span>予算: ¥{ch.budget.toLocaleString()}</span>
                        )}
                        {ch.costPerAccess != null && (
                          <span className="font-medium" style={{ color: mainColor }}>
                            読込単価: ¥{ch.costPerAccess.toLocaleString()}
                          </span>
                        )}
                        {ch.distributionQuantity != null && (
                          <span>配布: {ch.distributionQuantity.toLocaleString()}枚</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== CTA内訳 ===== */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: mainColor }} />
              CTAアクション内訳
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              ユーザーがどのアクション（予約・電話など）をクリックしたかの内訳です
            </p>
            {stats && Object.keys(stats.ctaByType).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(stats.ctaByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const pct = stats.ctaCount > 0
                      ? Math.round((count / stats.ctaCount) * 100)
                      : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-gray-600 shrink-0">
                          {CTA_TYPE_NAMES[type] || type}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: mainColor, opacity: 0.8 }}
                          >
                            {pct >= 15 && (
                              <span className="text-xs text-white font-medium">{pct}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-700 w-12 text-right">
                          {count}件
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm py-8 text-center">CTAデータがありません</p>
            )}
          </div>
        </div>

        {/* ===== エリア分布 ===== */}
        {topRegions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: mainColor }} />
              エリア分布
            </h2>
            <p className="text-xs text-gray-400 mb-4">QRコードが読み込まれたエリアの分布です（都道府県別）</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRegions} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="region"
                    tick={{ fontSize: 12, fill: "#374151" }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any) => [`${value}件`, "読込数"]) as any}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topRegions.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ===== 結果カテゴリ別統計 ===== */}
        {stats && Object.keys(stats.categoryStats).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: mainColor }} />
              診断結果カテゴリ別
            </h2>
            <p className="text-xs text-gray-400 mb-4">診断結果の分類ごとの件数と、CTAにつながった割合です</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">カテゴリ</th>
                    <th className="text-right py-2 text-gray-500 font-medium">診断数</th>
                    <th className="text-right py-2 text-gray-500 font-medium">CTA数</th>
                    <th className="text-right py-2 text-gray-500 font-medium">CTA率</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.categoryStats)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .map(([category, data]) => (
                      <tr key={category} className="border-b last:border-0">
                        <td className="py-2.5 text-gray-700">{category}</td>
                        <td className="py-2.5 text-right text-gray-700">{data.count}件</td>
                        <td className="py-2.5 text-right text-gray-700">{data.ctaCount}件</td>
                        <td className="py-2.5 text-right font-medium" style={{ color: mainColor }}>
                          {data.ctaRate}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 性別・年齢統計 ===== */}
        {stats && (genderTotal > 0 || Object.values(stats.ageRanges).some((v) => v > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* 性別 */}
            {genderTotal > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: mainColor }} />
                  性別分布
                </h2>
                <div className="space-y-3">
                  {[
                    { key: "male", label: "男性", color: "#3b82f6" },
                    { key: "female", label: "女性", color: "#ec4899" },
                    { key: "other", label: "その他", color: "#9ca3af" },
                  ].map(({ key, label, color }) => {
                    const count = stats.genderByType[key] || 0;
                    const pct = genderTotal > 0 ? Math.round((count / genderTotal) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-12 text-sm text-gray-600 font-medium">{label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: color }}
                          >
                            {pct >= 15 && (
                              <span className="text-xs text-white font-medium">{pct}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 w-14 text-right font-medium">{count}人</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 年齢層 */}
            {Object.values(stats.ageRanges).some((v) => v > 0) && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: mainColor }} />
                  年齢層分布
                </h2>
                <div className="space-y-2">
                  {Object.entries(stats.ageRanges).map(([range, count]) => {
                    const total = Object.values(stats.ageRanges).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={range} className="flex items-center gap-3">
                        <div className="w-14 text-xs text-gray-600 font-medium">{range}歳</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: "#10b981" }}
                          />
                        </div>
                        <div className="text-xs text-gray-700 w-16 text-right">{count}人 ({pct}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== QR読込日時一覧 ===== */}
        {scanHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: mainColor }} />
              QR読込日時一覧
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              QRコードが読み込まれた日時の一覧です（新しい順、最大200件）
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">読込日時</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">QRコード</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">エリア</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllScans ? scanHistory : scanHistory.slice(0, 20)).map((scan, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                        {new Date(scan.scannedAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}{" "}
                        <span className="text-gray-500">
                          {new Date(scan.scannedAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700">{scan.channelName}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{scan.area || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAllScans && scanHistory.length > 20 && (
              <button
                onClick={() => setShowAllScans(true)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-sm py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                style={{ color: mainColor }}
              >
                <ChevronDown className="w-4 h-4" />
                残り{scanHistory.length - 20}件を表示
              </button>
            )}
          </div>
        )}

        {/* フッター */}
        <div className="text-center py-8 border-t mt-8">
          <p className="text-xs text-gray-400">
            QRくるくる診断DX - QRコード効果レポート
          </p>
          <p className="text-xs text-gray-300 mt-1">
            このレポートは自動生成されたものです。最新のデータはページを更新すると反映されます。
          </p>
        </div>
      </main>
    </div>
  );
}

/** サマリーカード（上部のKPI表示に使う小さなカード） */
function SummaryCard({
  label,
  value,
  suffix,
  icon,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-500">{label}</div>
        <div style={{ color }} className="opacity-60">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-800">
        {suffix ? value : value.toLocaleString()}
        {suffix && <span className="text-lg ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

/** コンバージョンファネルの各ステップ */
function FunnelStep({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="text-center flex-1 max-w-[140px]">
      <div
        className="rounded-xl p-3 sm:p-4 mb-2"
        style={{ backgroundColor: `${color}10`, border: `2px solid ${color}30` }}
      >
        <div className="text-xl sm:text-2xl font-bold" style={{ color }}>
          {count.toLocaleString()}
        </div>
      </div>
      <div className="text-xs font-medium text-gray-700">{label}</div>
      <div className="text-xs text-gray-400">{percentage}%</div>
    </div>
  );
}
