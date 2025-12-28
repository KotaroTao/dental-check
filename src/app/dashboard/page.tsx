"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, MousePointerClick, Percent, ChevronDown, ChevronUp, QrCode, Plus, Settings, Trash2, Building2, TrendingUp, TrendingDown, Download, ArrowUpDown } from "lucide-react";
import { LocationSection } from "@/components/dashboard/location-section";
import { CTAChart } from "@/components/dashboard/cta-chart";

// 期間の選択肢
const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
  { value: "custom", label: "期間指定" },
];

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "矯正チェック",
};

interface Stats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaByType?: Record<string, number>;
  // コンバージョン関連
  clinicPageViews: number;
  ctaFromResult: number;
  ctaFromClinicPage: number;
  resultConversionRate: number;
  clinicPageConversionRate: number;
  // 年齢・性別統計
  genderByType?: Record<string, number>;
  ageRanges?: Record<string, number>;
  // 前期比トレンド
  trends?: {
    accessCount: { value: number; isNew: boolean };
    completedCount: { value: number; isNew: boolean };
    ctaCount: { value: number; isNew: boolean };
  };
  prevPeriod?: {
    accessCount: number;
    completedCount: number;
    ctaCount: number;
  };
}

// CTAタイプの表示名
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
};

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  diagnosisTypeSlug: string;
  isActive: boolean;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  userAge: number | null;
  userGender: string | null;
  diagnosisType: string;
  diagnosisTypeSlug: string;
  channelName: string;
  channelId: string;
  resultCategory: string;
  ctaType: string | null;
  ctaClickCount: number;
}

// 性別の表示名
const GENDER_NAMES: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "-",
};

// 年齢層の表示名
const AGE_RANGE_NAMES: Record<string, string> = {
  "~19": "~19歳",
  "20-29": "20代",
  "30-39": "30代",
  "40-49": "40代",
  "50-59": "50代",
  "60~": "60歳~",
};

// トレンドインジケーターコンポーネント
function TrendIndicator({ trend, showValue = true }: { trend: { value: number; isNew: boolean }; showValue?: boolean }) {
  if (trend.value === 0 && !trend.isNew) return null;

  // 前期が0で今期にデータがある場合は「NEW」と表示
  if (trend.isNew) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
        NEW
      </span>
    );
  }

  const isPositive = trend.value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? "text-green-600" : "text-red-600"
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {showValue && <span>{isPositive ? "+" : ""}{trend.value}%</span>}
    </span>
  );
}

// スケルトンコンポーネント
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// 統計カードスケルトン
function StatsCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

// 履歴テーブルスケルトン
function HistoryTableSkeleton() {
  return (
    <div className="divide-y">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-4 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ソート
  type SortField = "createdAt" | "userAge" | "ctaClickCount";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // ソート切り替え
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // ソートアイコン
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1" />
    );
  };

  // ソートされた履歴
  const sortedHistory = [...history].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "userAge":
        comparison = (a.userAge || 0) - (b.userAge || 0);
        break;
      case "ctaClickCount":
        comparison = a.ctaClickCount - b.ctaClickCount;
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // フィルター
  const [period, setPeriod] = useState("month");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedDiagnosisType, setSelectedDiagnosisType] = useState("");

  // カスタム期間
  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };
  const [customStartDate, setCustomStartDate] = useState(() => getDefaultDates().start);
  const [customEndDate, setCustomEndDate] = useState(() => getDefaultDates().end);

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 経路一覧取得
  const fetchChannels = useCallback(async () => {
    try {
      const response = await fetch("/api/channels");
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  }, []);

  // 統計データ取得
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (selectedChannelId) params.set("channelId", selectedChannelId);
      if (period === "custom") {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }

      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [period, selectedChannelId, customStartDate, customEndDate]);

  // 履歴データ取得
  const fetchHistory = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      const params = new URLSearchParams({
        period,
        offset: offset.toString(),
        limit: "50",
      });
      if (selectedChannelId) params.set("channelId", selectedChannelId);
      if (selectedDiagnosisType) params.set("diagnosisType", selectedDiagnosisType);
      if (period === "custom") {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }

      const response = await fetch(`/api/dashboard/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setHistory((prev) => [...prev, ...data.history]);
        } else {
          setHistory(data.history);
        }
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [period, selectedChannelId, selectedDiagnosisType, customStartDate, customEndDate]);

  // 初回読み込み
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // フィルター変更時
  useEffect(() => {
    fetchStats();
    fetchHistory(0, false);
  }, [fetchStats, fetchHistory]);

  // 経路削除
  const handleDeleteChannel = async (id: string) => {
    if (!confirm("この経路を削除しますか？関連するアクセスログも削除されます。")) {
      return;
    }

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChannels(channels.filter((c) => c.id !== id));
        // 統計も再取得
        fetchStats();
        fetchHistory(0, false);
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  // もっと見る
  const handleLoadMore = () => {
    fetchHistory(history.length, true);
  };

  // CSVエクスポート：統計データ
  const exportStatsToCSV = () => {
    if (!stats) return;

    const rows: string[][] = [
      ["項目", "値"],
      ["アクセス数", stats.accessCount.toString()],
      ["診断完了数", stats.completedCount.toString()],
      ["完了率(%)", stats.completionRate.toString()],
      ["CTAクリック数", stats.ctaCount.toString()],
      ["医院ページ閲覧数", stats.clinicPageViews.toString()],
      ["診断結果→CTAクリック", stats.ctaFromResult.toString()],
      ["診断結果→CTAコンバージョン率(%)", stats.resultConversionRate.toString()],
      ["医院ページ→CTAクリック", stats.ctaFromClinicPage.toString()],
      ["医院ページ→CTAコンバージョン率(%)", stats.clinicPageConversionRate.toString()],
    ];

    // CTA内訳
    if (stats.ctaByType) {
      rows.push(["", ""]);
      rows.push(["CTAタイプ別クリック数", ""]);
      Object.entries(stats.ctaByType).forEach(([type, count]) => {
        rows.push([CTA_TYPE_NAMES[type] || type, count.toString()]);
      });
    }

    // 性別分布
    if (stats.genderByType) {
      rows.push(["", ""]);
      rows.push(["性別分布", ""]);
      Object.entries(stats.genderByType).forEach(([gender, count]) => {
        rows.push([GENDER_NAMES[gender] || gender, count.toString()]);
      });
    }

    // 年齢層分布
    if (stats.ageRanges) {
      rows.push(["", ""]);
      rows.push(["年齢層分布", ""]);
      Object.entries(stats.ageRanges).forEach(([range, count]) => {
        rows.push([AGE_RANGE_NAMES[range] || range, count.toString()]);
      });
    }

    downloadCSV(rows, "統計サマリー");
  };

  // CSVエクスポート：診断履歴
  const exportHistoryToCSV = async () => {
    // 大量データの警告
    if (totalCount > 5000) {
      if (!confirm(`${totalCount.toLocaleString()}件のデータをエクスポートします。\n処理に時間がかかる場合があります。続行しますか？`)) {
        return;
      }
    }

    setIsExporting(true);

    // 全履歴を取得
    const params = new URLSearchParams({
      period,
      offset: "0",
      limit: "10000", // 大量取得
    });
    if (selectedChannelId) params.set("channelId", selectedChannelId);
    if (selectedDiagnosisType) params.set("diagnosisType", selectedDiagnosisType);
    if (period === "custom") {
      params.set("startDate", customStartDate);
      params.set("endDate", customEndDate);
    }

    try {
      const response = await fetch(`/api/dashboard/history?${params}`);
      if (!response.ok) {
        alert("エクスポートに失敗しました");
        return;
      }
      const data = await response.json();

      const rows: string[][] = [
        ["日時", "年齢", "性別", "診断タイプ", "経路", "結果", "CTAクリック回数"],
      ];

      data.history.forEach((item: HistoryItem) => {
        rows.push([
          formatDate(item.createdAt),
          item.userAge !== null ? item.userAge.toString() : "",
          item.userGender || "",
          item.diagnosisType,
          item.channelName,
          item.resultCategory,
          item.ctaClickCount.toString(),
        ]);
      });

      downloadCSV(rows, "診断履歴");
    } catch (error) {
      console.error("Failed to export history:", error);
      alert("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  };

  // CSVダウンロード共通処理
  const downloadCSV = (rows: string[][], filename: string) => {
    const BOM = "\uFEFF"; // Excel用BOM
    const csvContent = rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 初回読み込み中はスケルトンを表示
  if (isLoading && !stats && channels.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        {/* 経路スケルトン */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
        {/* 統計サマリースケルトン */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        </div>
        {/* 履歴スケルトン */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-32" />
          </div>
          <HistoryTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </div>

      {/* 経路セクション */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            経路
          </h2>
          <Link href="/dashboard/channels/new">
            <Button className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              新しい経路を作成
            </Button>
          </Link>
        </div>

        {channels.length === 0 ? (
          <div className="p-12 text-center">
            <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ経路がありません
            </h3>
            <p className="text-gray-500 mb-6">
              経路を作成して計測を始めましょう
            </p>
            <Link href="/dashboard/channels/new">
              <Button>最初の経路を作成する</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* PC用テーブル */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      経路名
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      診断
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      コード
                    </th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">
                      ステータス
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {channels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{channel.name}</div>
                        {channel.description && (
                          <div className="text-sm text-gray-500">
                            {channel.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {channel.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {channel.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            有効
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            無効
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/channels/${channel.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <QrCode className="w-4 h-4" />
                              詳細
                            </Button>
                          </Link>
                          <Link href={`/dashboard/channels/${channel.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChannel(channel.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル用カード */}
            <div className="md:hidden divide-y">
              {channels.map((channel) => (
                <div key={channel.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{channel.name}</div>
                      {channel.description && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {channel.description}
                        </div>
                      )}
                    </div>
                    {channel.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        有効
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        無効
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug}
                    </span>
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {channel.code}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/channels/${channel.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <QrCode className="w-4 h-4" />
                        詳細
                      </Button>
                    </Link>
                    <Link href={`/dashboard/channels/${channel.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 統計サマリー */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            統計サマリー
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportStatsToCSV}
              disabled={!stats}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              CSVエクスポート
            </Button>
            <div className="flex gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                <option value="">全ての経路</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm bg-white"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm bg-white"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              アクセス
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {stats?.accessCount.toLocaleString() || 0}
              </span>
              {stats?.trends && <TrendIndicator trend={stats.trends.accessCount} />}
            </div>
            {stats?.prevPeriod && stats.prevPeriod.accessCount > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                前期: {stats.prevPeriod.accessCount.toLocaleString()}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" />
              診断完了
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">
                {stats?.completedCount.toLocaleString() || 0}
              </span>
              {stats?.trends && <TrendIndicator trend={stats.trends.completedCount} />}
            </div>
            {stats?.prevPeriod && stats.prevPeriod.completedCount > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                前期: {stats.prevPeriod.completedCount.toLocaleString()}
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Percent className="w-4 h-4" />
              完了率
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.completionRate || 0}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MousePointerClick className="w-4 h-4" />
              CTAクリック
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-600">
                {stats?.ctaCount.toLocaleString() || 0}
              </span>
              {stats?.trends && <TrendIndicator trend={stats.trends.ctaCount} />}
            </div>
            {stats?.prevPeriod && stats.prevPeriod.ctaCount > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                前期: {stats.prevPeriod.ctaCount.toLocaleString()}
              </div>
            )}
            {/* CTA内訳 */}
            {stats?.ctaByType && Object.keys(stats.ctaByType).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                {Object.entries(stats.ctaByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs text-gray-600">
                      <span>{CTA_TYPE_NAMES[type] || type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* コンバージョン率 */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            コンバージョン率
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 診断結果→CTA */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">診断結果 → CTA</span>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.resultConversionRate || 0}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>診断完了 {stats?.completedCount.toLocaleString() || 0}件</span>
                <span>→</span>
                <span>クリック {stats?.ctaFromResult.toLocaleString() || 0}件</span>
              </div>
            </div>

            {/* 医院紹介ページ→CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  医院紹介ページ → CTA
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {stats?.clinicPageConversionRate || 0}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>ページ閲覧 {stats?.clinicPageViews.toLocaleString() || 0}件</span>
                <span>→</span>
                <span>クリック {stats?.ctaFromClinicPage.toLocaleString() || 0}件</span>
              </div>
            </div>
          </div>
        </div>

        {/* 年齢・性別統計 */}
        {stats?.completedCount && stats.completedCount > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              年齢・性別分布
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 性別分布 */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-3">性別</h4>
                <div className="space-y-2">
                  {stats.genderByType && Object.entries(stats.genderByType).map(([gender, count]) => {
                    const total = Object.values(stats.genderByType!).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={gender} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16">{GENDER_NAMES[gender] || gender}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              gender === "male" ? "bg-blue-500" : gender === "female" ? "bg-pink-500" : "bg-gray-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-20 text-right">
                          {count}人 ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 年齢層分布 */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-3">年齢層</h4>
                <div className="space-y-2">
                  {stats.ageRanges && Object.entries(stats.ageRanges).map(([range, count]) => {
                    const total = Object.values(stats.ageRanges!).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={range} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16">{AGE_RANGE_NAMES[range] || range}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-20 text-right">
                          {count}人 ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 診断実施エリア */}
      <LocationSection
        period={period}
        channelId={selectedChannelId}
        customStartDate={period === "custom" ? customStartDate : undefined}
        customEndDate={period === "custom" ? customEndDate : undefined}
      />

      {/* CTAクリック推移グラフ */}
      <CTAChart
        period={period}
        channelId={selectedChannelId}
        customStartDate={period === "custom" ? customStartDate : undefined}
        customEndDate={period === "custom" ? customEndDate : undefined}
      />

      {/* 診断完了履歴 */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-bold">診断完了履歴</h2>
            <div className="flex gap-2 ml-auto">
              <select
                value={selectedDiagnosisType}
                onChange={(e) => setSelectedDiagnosisType(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                <option value="">全ての診断</option>
                <option value="oral-age">お口年齢診断</option>
                <option value="child-orthodontics">矯正チェック</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={exportHistoryToCSV}
                disabled={history.length === 0 || isExporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "エクスポート中..." : "CSV"}
              </Button>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ診断完了履歴がありません
            </h3>
            <p className="text-gray-500">
              診断が完了されると、ここに履歴が表示されます
            </p>
          </div>
        ) : (
          <>
            {/* PC用テーブル */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      <span className="flex items-center">
                        日時
                        <SortIcon field="createdAt" />
                      </span>
                    </th>
                    <th
                      className="text-center px-2 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("userAge")}
                    >
                      <span className="flex items-center justify-center">
                        年齢
                        <SortIcon field="userAge" />
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500">
                      性別
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      診断
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      経路
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                      結果
                    </th>
                    <th
                      className="text-center px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("ctaClickCount")}
                    >
                      <span className="flex items-center justify-center">
                        CTA
                        <SortIcon field="ctaClickCount" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-2 py-4 text-center">
                        <span className="text-sm text-gray-700">
                          {item.userAge !== null ? `${item.userAge}歳` : "-"}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <span className="text-sm text-gray-700">
                          {item.userGender || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {item.diagnosisType}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {item.channelName}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">
                          {item.resultCategory}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.ctaClickCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                            {item.ctaClickCount}回
                          </span>
                        ) : (
                          <span className="text-gray-400">−</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル用カード */}
            <div className="md:hidden divide-y">
              {sortedHistory.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </div>
                    {item.ctaClickCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                        CTA {item.ctaClickCount}回
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">
                      {item.userAge !== null ? `${item.userAge}歳` : "-"} / {item.userGender || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {item.diagnosisType}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.channelName}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">結果: </span>
                    <span className="text-gray-900">{item.resultCategory}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                該当: {totalCount.toLocaleString()}件
              </div>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore ? "読み込み中..." : "もっと見る"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* クイックスタートガイド（経路がない場合のみ表示） */}
      {channels.length === 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h2 className="text-lg font-bold text-blue-900 mb-4">
            はじめての方へ
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                1
              </div>
              <h3 className="font-medium mb-1">経路を作成</h3>
              <p className="text-sm text-gray-600">
                「チラシ①」「医院前看板」など、計測したい経路を登録
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                2
              </div>
              <h3 className="font-medium mb-1">QRコードを印刷</h3>
              <p className="text-sm text-gray-600">
                発行されたQRコードをチラシや看板に印刷
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                3
              </div>
              <h3 className="font-medium mb-1">効果を確認</h3>
              <p className="text-sm text-gray-600">
                ダッシュボードで経路別の効果を比較
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
