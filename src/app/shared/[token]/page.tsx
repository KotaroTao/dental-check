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
} from "lucide-react";

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
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
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

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [stats, setStats] = useState<SharedStats | null>(null);
  const [channels, setChannels] = useState<SharedChannel[]>([]);
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
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md text-center">
          <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800 mb-2">共有ダッシュボード</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const genderTotal = stats
    ? (stats.genderByType.male || 0) + (stats.genderByType.female || 0) + (stats.genderByType.other || 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-800">{clinic?.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">共有ダッシュボード</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 期間フィルター */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* サマリーカード */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500 mb-1">QR読込数</div>
              <div className="text-2xl font-bold text-gray-800">
                {stats.accessCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500 mb-1">診断完了数</div>
              <div className="text-2xl font-bold text-gray-800">
                {stats.completedCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500 mb-1">CTA数</div>
              <div className="text-2xl font-bold text-gray-800">
                {stats.ctaCount.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="text-xs text-gray-500 mb-1">CTA率</div>
              <div className="text-2xl font-bold text-gray-800">
                {stats.ctaRate}%
              </div>
            </div>
          </div>
        )}

        {/* QRコード一覧 */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QRコード別 効果
          </h2>
          {channels.length === 0 ? (
            <p className="text-gray-400 text-sm">QRコードがありません</p>
          ) : (
            <div className="space-y-3">
              {channels.map((ch) => (
                <div key={ch.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-gray-800">{ch.name}</div>
                    <span className="text-xs text-gray-400">
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
                      <div className="text-lg font-bold text-gray-700">{ch.ctaRate}%</div>
                      <div className="text-xs text-gray-400">CTA率</div>
                    </div>
                  </div>
                  {(ch.budget || ch.costPerAccess || ch.distributionMethod || ch.distributionQuantity) && (
                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-3 text-xs text-gray-500">
                      {ch.budget && (
                        <span>予算: ¥{ch.budget.toLocaleString()}</span>
                      )}
                      {ch.costPerAccess && (
                        <span>読込単価: ¥{ch.costPerAccess.toLocaleString()}</span>
                      )}
                      {ch.distributionMethod && (
                        <span>配布: {ch.distributionMethod}</span>
                      )}
                      {ch.distributionQuantity && (
                        <span>枚数: {ch.distributionQuantity.toLocaleString()}枚</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA内訳 */}
        {stats && Object.keys(stats.ctaByType).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              CTA内訳
            </h2>
            <div className="space-y-2">
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
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-sm font-medium text-gray-700 w-16 text-right">
                        {count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 結果カテゴリ別統計 */}
        {stats && Object.keys(stats.categoryStats).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              結果カテゴリ別
            </h2>
            <div className="space-y-2">
              {Object.entries(stats.categoryStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([category, data]) => (
                  <div key={category} className="flex items-center gap-3 text-sm">
                    <div className="w-28 text-gray-600 shrink-0 truncate">{category}</div>
                    <div className="flex-1 text-gray-700">{data.count}件</div>
                    <div className="text-gray-500">CTA {data.ctaCount}件 ({data.ctaRate}%)</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 性別・年齢統計 */}
        {stats && (genderTotal > 0 || Object.values(stats.ageRanges).some((v) => v > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* 性別 */}
            {genderTotal > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  性別
                </h2>
                <div className="space-y-2">
                  {[
                    { key: "male", label: "男性", color: "bg-blue-500" },
                    { key: "female", label: "女性", color: "bg-pink-500" },
                    { key: "other", label: "その他", color: "bg-gray-400" },
                  ].map(({ key, label, color }) => {
                    const count = stats.genderByType[key] || 0;
                    const pct = genderTotal > 0 ? Math.round((count / genderTotal) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-12 text-sm text-gray-600">{label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-sm text-gray-700 w-20 text-right">{count} ({pct}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 年齢層 */}
            {Object.values(stats.ageRanges).some((v) => v > 0) && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  年齢層
                </h2>
                <div className="space-y-1.5">
                  {Object.entries(stats.ageRanges).map(([range, count]) => {
                    const total = Object.values(stats.ageRanges).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={range} className="flex items-center gap-3">
                        <div className="w-12 text-xs text-gray-600">{range}歳</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-gray-700 w-16 text-right">{count} ({pct}%)</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* フッター */}
        <div className="text-center text-xs text-gray-400 py-8">
          QRくるくる診断DX - 共有ダッシュボード
        </div>
      </main>
    </div>
  );
}
