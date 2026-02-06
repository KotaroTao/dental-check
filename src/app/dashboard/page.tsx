"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Plus,
  Trash2,
  Download,
  ArrowUpDown,
  X,
  AlertTriangle,
  CreditCard,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { LocationSection } from "@/components/dashboard/location-section";
import { EffectivenessSummary } from "@/components/dashboard/effectiveness-summary";
import { QRCodeRow } from "@/components/dashboard/qr-code-row";
import { HistoryCTAPopover } from "@/components/dashboard/history-cta-popover";
import { Skeleton } from "@/components/dashboard/skeleton";
import type { Channel, ChannelStats, OverallStats, HistoryItem, SubscriptionInfo } from "@/components/dashboard/types";
import { CTA_TYPE_NAMES, CHANNEL_COLORS } from "@/components/dashboard/types";

// 期間の選択肢
const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
  { value: "all", label: "全期間" },
  { value: "custom", label: "期間指定" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHiddenChannels, setShowHiddenChannels] = useState(false);

  // 履歴の表示件数とページネーション
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);

  // サブスクリプション情報
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showQRLimitModal, setShowQRLimitModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // QRコードソート
  type ChannelSortField = "createdAt" | "accessCount" | "budget" | "costPerAccess" | "ctaCount" | "ctaRate";
  const [channelSortField, setChannelSortField] = useState<ChannelSortField>("createdAt");

  // ソート
  type SortField = "createdAt" | "userAge" | "ctaClickCount";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

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

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
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
  }, [history, sortField, sortDirection]);

  // フィルター
  const [period, setPeriod] = useState("all");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [summaryChannelIds, setSummaryChannelIds] = useState<string[]>([]); // 効果測定サマリー用（複数選択）

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 画像モーダル

  // QRコード一覧取得
  const fetchChannels = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }
      const response = await fetch(`/api/channels?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  }, [period, customStartDate, customEndDate]);

  // チャンネル別統計取得
  const fetchChannelStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }

      const response = await fetch(`/api/dashboard/channel-stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChannelStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch channel stats:", error);
    }
  }, [period, customStartDate, customEndDate]);

  // 全体統計取得
  const fetchOverallStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }
      if (summaryChannelIds.length > 0) {
        params.set("channelIds", summaryChannelIds.join(","));
      }

      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOverallStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch overall stats:", error);
    }
  }, [period, customStartDate, customEndDate, summaryChannelIds]);

  // 履歴データ取得（ページネーション対応）
  const fetchHistory = useCallback(
    async (page = 1, limit = historyLimit) => {
      try {
        setIsLoadingMore(true);
        if (page === 1) setIsLoading(true);

        const offset = (page - 1) * limit;
        const params = new URLSearchParams({
          period,
          offset: offset.toString(),
          limit: limit.toString(),
        });
        if (selectedChannelId) params.set("channelId", selectedChannelId);
        if (period === "custom") {
          params.set("startDate", customStartDate);
          params.set("endDate", customEndDate);
        }
        // 2ページ目以降はCOUNTクエリをスキップしてパフォーマンス最適化
        if (page > 1) {
          params.set("skipCount", "true");
        }

        const response = await fetch(`/api/dashboard/history?${params}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history);
          // skipCount時はtotalCountが-1なので更新しない（初回取得値を維持）
          if (data.totalCount >= 0) {
            setTotalCount(data.totalCount);
          }
          setHasMore(data.hasMore);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [period, selectedChannelId, customStartDate, customEndDate, historyLimit]
  );

  // サブスクリプション情報取得
  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  }, []);

  // 初回読み込み（サブスクリプション情報のみ）
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // フィルター変更時（初回含む）- fetchOverallStatsは除く
  useEffect(() => {
    fetchChannels();
    fetchChannelStats();
    setHistoryPage(1);
    fetchHistory(1);
  }, [fetchChannels, fetchChannelStats, fetchHistory]);

  // summaryChannelIds変更時（効果測定サマリー用）
  useEffect(() => {
    fetchOverallStats();
  }, [fetchOverallStats]);

  // チャンネル変更時にsummaryChannelIdsを更新
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const activeIds = channels
      .filter((c) => c.isActive)
      .map((c) => c.id);

    if (!isInitialized && activeIds.length > 0) {
      // 初回は全選択状態にする
      setSummaryChannelIds(activeIds);
      setIsInitialized(true);
    } else {
      setSummaryChannelIds((prev) => {
        // 非表示チャンネルを除外
        return prev.filter((id) => activeIds.includes(id));
      });
    }
  }, [channels, isInitialized]);

  // QRコード非表示
  const handleHideChannel = async (id: string) => {
    if (!confirm("このQRコードを非表示にしますか？統計からも除外されます。後から復元できます。")) {
      return;
    }

    try {
      const response = await fetch(`/api/channels/${id}`, { method: "DELETE" });
      if (response.ok) {
        setChannels(channels.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
        fetchChannelStats();
        fetchOverallStats();
        setHistoryPage(1);
        fetchHistory(1);
      }
    } catch (error) {
      console.error("Failed to hide channel:", error);
    }
  };

  // QRコード復元
  const handleRestoreChannel = async (id: string) => {
    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (response.ok) {
        setChannels(channels.map((c) => (c.id === id ? { ...c, isActive: true } : c)));
        fetchChannelStats();
        fetchOverallStats();
        setHistoryPage(1);
        fetchHistory(1);
      }
    } catch (error) {
      console.error("Failed to restore channel:", error);
    }
  };

  // QRコード完全削除
  const handlePermanentDeleteChannel = async (id: string) => {
    const channel = channels.find((c) => c.id === id);
    if (!channel) return;

    const confirmed = confirm(
      `【完全削除の警告】\n\n「${channel.name}」を完全に削除します。\n\nこの操作は取り消せません。以下のデータがすべて削除されます：\n• QRコード情報\n• QR読み込み履歴（${channel.scanCount}件）\n• 診断結果データ\n• アクセスログ\n\n本当に完全削除しますか？`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/channels/${id}/permanent-delete`, {
        method: "DELETE",
      });
      if (response.ok) {
        setChannels(channels.filter((c) => c.id !== id));
        fetchChannelStats();
        fetchOverallStats();
        setHistoryPage(1);
        fetchHistory(1);
      } else {
        const data = await response.json();
        alert(data.error || "完全削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to permanently delete channel:", error);
      alert("完全削除に失敗しました");
    }
  };

  // 履歴削除
  const handleDeleteHistory = async (item: HistoryItem) => {
    if (!confirm("この履歴を削除しますか？削除後は効果測定サマリーやQR読み込みエリアにも反映されなくなります。")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/dashboard/history/${item.id}?type=${item.type}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        // ローカルステートから削除
        setHistory((prev) => prev.filter((h) => h.id !== item.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        // 統計を更新
        fetchOverallStats();
      } else {
        const data = await response.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete history:", error);
      alert("削除に失敗しました");
    }
  };

  // 新規作成ボタンクリック
  const handleNewQRCodeClick = () => {
    if (!subscription) {
      router.push("/dashboard/channels/new");
      return;
    }

    // デモアカウントの場合
    if (subscription.isDemo) {
      setShowDemoModal(true);
      return;
    }

    if (!subscription.canCreateQR && subscription.qrCodeLimit !== null) {
      setShowQRLimitModal(true);
      return;
    }

    router.push("/dashboard/channels/new");
  };

  // ページ移動
  const handlePageChange = (newPage: number) => {
    setHistoryPage(newPage);
    fetchHistory(newPage);
  };

  // 表示件数の変更
  const handleLimitChange = (newLimit: number) => {
    setHistoryLimit(newLimit);
    setHistoryPage(1);
    fetchHistory(1, newLimit);
  };

  // QRコードのソート済みリスト
  const getSortedChannels = useCallback((channelList: Channel[]) => {
    return [...channelList].sort((a, b) => {
      const statsA = channelStats[a.id];
      const statsB = channelStats[b.id];
      const accessA = statsA?.accessCount ?? a.scanCount;
      const accessB = statsB?.accessCount ?? b.scanCount;

      if (channelSortField === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (channelSortField === "accessCount") {
        return accessB - accessA;
      }
      if (channelSortField === "budget") {
        return (b.budget || 0) - (a.budget || 0);
      }
      if (channelSortField === "costPerAccess") {
        const costA = a.budget && accessA > 0 ? a.budget / accessA : Infinity;
        const costB = b.budget && accessB > 0 ? b.budget / accessB : Infinity;
        return costA - costB;
      }

      if (!statsA || !statsB) return 0;

      switch (channelSortField) {
        case "ctaCount":
          return statsB.ctaCount - statsA.ctaCount;
        case "ctaRate":
          return statsB.ctaRate - statsA.ctaRate;
        default:
          return 0;
      }
    });
  }, [channelStats, channelSortField]);

  // CSVエクスポート
  const exportHistoryToCSV = async () => {
    if (totalCount > 5000) {
      if (!confirm(`${totalCount.toLocaleString()}件のデータをエクスポートします。続行しますか？`)) {
        return;
      }
    }

    setIsExporting(true);

    const params = new URLSearchParams({ period, offset: "0", limit: "10000" });
    if (selectedChannelId) params.set("channelId", selectedChannelId);
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
        ["日時", "年齢", "性別", "診断タイプ", "QRコード", "エリア", "CTAクリック回数", "CTA内訳"],
      ];

      data.history.forEach((item: HistoryItem) => {
        const ctaDetails = Object.entries(item.ctaByType || {})
          .map(([type, count]) => `${CTA_TYPE_NAMES[type] || type}:${count}`)
          .join(" / ");

        rows.push([
          formatDate(item.createdAt),
          item.userAge !== null ? item.userAge.toString() : "",
          item.userGender || "",
          item.diagnosisType,
          item.channelName,
          item.area,
          item.ctaClickCount.toString(),
          ctaDetails,
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ).join("\n");

      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `診断履歴_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export history:", error);
      alert("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  };

  // メモ化された派生データ（Hooksルールに従い、条件分岐の前に配置）
  const activeChannels = useMemo(() => channels.filter((c: Channel) => c.isActive), [channels]);
  const hiddenChannels = useMemo(() => channels.filter((c: Channel) => !c.isActive), [channels]);
  const sortedActiveChannels = useMemo(() => getSortedChannels(activeChannels), [activeChannels, getSortedChannels]);
  const displayChannels = useMemo(() => showHiddenChannels ? hiddenChannels : sortedActiveChannels, [showHiddenChannels, hiddenChannels, sortedActiveChannels]);

  // ローディング
  if (isLoading && channels.length === 0) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">QRコードの効果測定と管理</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border rounded-lg px-1 py-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm bg-transparent outline-none"
              />
              <span className="text-gray-400">〜</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm bg-transparent outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 効果測定サマリー */}
      <EffectivenessSummary
        channels={channels}
        overallStats={overallStats}
        summaryChannelIds={summaryChannelIds}
        setSummaryChannelIds={setSummaryChannelIds}
        isDemo={subscription?.isDemo}
        onDemoClick={() => setShowDemoModal(true)}
      />

      {/* QRコードセクション */}
      <div className="bg-white rounded-2xl shadow-sm border">
        {/* ヘッダー */}
        <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">QRコード</h2>
                <p className="text-xs text-gray-500">
                  {activeChannels.length}個のアクティブなQRコード
                </p>
              </div>
            </div>
            <Button
              onClick={handleNewQRCodeClick}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              新規作成
            </Button>
          </div>
        </div>

        {/* タブとソート */}
        <div className="flex items-center justify-between border-b px-5 bg-gray-50/50">
          <div className="flex gap-1">
            <button
              onClick={() => setShowHiddenChannels(false)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                !showHiddenChannels
                  ? "bg-white text-blue-600 border-t border-l border-r -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              有効 ({activeChannels.length})
            </button>
            <button
              onClick={() => setShowHiddenChannels(true)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                showHiddenChannels
                  ? "bg-white text-blue-600 border-t border-l border-r -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              非表示 ({hiddenChannels.length})
            </button>
          </div>
          {!showHiddenChannels && activeChannels.length > 1 && (
            <select
              value={channelSortField}
              onChange={(e) => setChannelSortField(e.target.value as ChannelSortField)}
              className="px-3 py-1.5 border rounded-lg text-xs bg-white text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">作成日順</option>
              <option value="accessCount">QR読込順</option>
              <option value="budget">予算順</option>
              <option value="costPerAccess">読込単価順</option>
              <option value="ctaCount">CTA順</option>
              <option value="ctaRate">CTA率順</option>
            </select>
          )}
        </div>

        {/* QRコードリスト */}
        {displayChannels.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showHiddenChannels ? "非表示のQRコードはありません" : "QRコードがありません"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {showHiddenChannels
                ? "非表示にしたQRコードがここに表示されます"
                : "最初のQRコードを作成してみましょう"}
            </p>
            {!showHiddenChannels && (
              <Button onClick={handleNewQRCodeClick} className="gap-2">
                <Plus className="w-4 h-4" />
                QRコードを作成
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* PC用テーブル */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">QRコード</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-24">QR読込</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-24">予算</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-20">読込単価</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-20">CTA</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-20">CTA率</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-24">作成日</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayChannels.map((channel, index) => (
                    <QRCodeRow
                      key={channel.id}
                      channel={channel}
                      stats={channelStats[channel.id]}
                      color={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                      onHide={() => handleHideChannel(channel.id)}
                      onRestore={() => handleRestoreChannel(channel.id)}
                      onPermanentDelete={() => handlePermanentDeleteChannel(channel.id)}

                      isDemo={subscription?.isDemo}
                      onDemoClick={() => setShowDemoModal(true)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* モバイル用リスト */}
            <div className="md:hidden divide-y">
              {displayChannels.map((channel, index) => (
                <QRCodeRow
                  key={channel.id}
                  channel={channel}
                  stats={channelStats[channel.id]}
                  color={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                  onHide={() => handleHideChannel(channel.id)}
                  onRestore={() => handleRestoreChannel(channel.id)}
                  onPermanentDelete={() => handlePermanentDeleteChannel(channel.id)}
                  isDemo={subscription?.isDemo}
                  onDemoClick={() => setShowDemoModal(true)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* QR読み込みエリア */}
      <LocationSection
        period={period}
        channels={channels}
        customStartDate={period === "custom" ? customStartDate : undefined}
        customEndDate={period === "custom" ? customEndDate : undefined}
      />


      {/* QR読み込み履歴 */}
      <div className="bg-white rounded-2xl shadow-sm border">
        <div className="p-5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">読み込み履歴</h2>
                <p className="text-xs text-gray-500">
                  {totalCount.toLocaleString()}件の診断完了
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              >
                <option value="">全てのQRコード</option>
                {activeChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (subscription?.isDemo) {
                    setShowDemoModal(true);
                  } else {
                    exportHistoryToCSV();
                  }
                }}
                disabled={history.length === 0 || isExporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "..." : "CSV"}
              </Button>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">履歴がありません</h3>
            <p className="text-sm text-gray-500">
              選択した期間内に診断が完了していません
            </p>
          </div>
        ) : (
          <>
            {/* PC用テーブル */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("createdAt")}
                    >
                      <span className="flex items-center">
                        日時
                        <SortIcon field="createdAt" />
                      </span>
                    </th>
                    <th
                      className="text-center px-2 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("userAge")}
                    >
                      <span className="flex items-center justify-center">
                        年齢
                        <SortIcon field="userAge" />
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500">性別</th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">診断</th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">結果</th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">QRコード</th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500">CTA</th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">エリア</th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-700">
                        {item.userAge !== null ? `${item.userAge}歳` : "-"}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-700">
                        {item.userGender || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {item.diagnosisType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {item.resultCategory ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                            {item.resultCategory}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.channelName}</td>
                      <td className="px-2 py-3 text-center">
                        <HistoryCTAPopover ctaClickCount={item.ctaClickCount} ctaByType={item.ctaByType} />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.area}</td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => subscription?.isDemo ? setShowDemoModal(true) : handleDeleteHistory(item)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="この履歴を削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル用カード */}
            <div className="md:hidden divide-y">
              {sortedHistory.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{formatDate(item.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {item.diagnosisType}
                      </span>
                      {item.resultCategory && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          {item.resultCategory}
                        </span>
                      )}
                      <button
                        onClick={() => subscription?.isDemo ? setShowDemoModal(true) : handleDeleteHistory(item)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="この履歴を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">
                        {item.userAge !== null ? `${item.userAge}歳` : "-"} / {item.userGender || "-"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{item.channelName}</span>
                    </div>
                    {item.ctaClickCount > 0 && (
                      <HistoryCTAPopover ctaClickCount={item.ctaClickCount} ctaByType={item.ctaByType} />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{item.area}</div>
                </div>
              ))}
            </div>

            {/* フッター: 表示件数切り替え + ページネーション */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* 左: 表示件数セレクタ */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>表示:</span>
                  <select
                    value={historyLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value={10}>10件</option>
                    <option value={50}>50件</option>
                    <option value={100}>100件</option>
                  </select>
                  <span className="text-gray-400">
                    / {totalCount.toLocaleString()}件中
                  </span>
                </div>

                {/* 右: ページネーション */}
                {totalCount > historyLimit && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(historyPage - 1)}
                      disabled={historyPage <= 1 || isLoadingMore}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {(() => {
                      const totalPages = Math.ceil(totalCount / historyLimit);
                      const pages: (number | "...")[] = [];

                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (historyPage > 3) pages.push("...");
                        const start = Math.max(2, historyPage - 1);
                        const end = Math.min(totalPages - 1, historyPage + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (historyPage < totalPages - 2) pages.push("...");
                        pages.push(totalPages);
                      }

                      return pages.map((p, idx) =>
                        p === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-sm text-gray-400">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === historyPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                            disabled={isLoadingMore}
                            className="h-8 min-w-[2rem] px-2 text-sm"
                          >
                            {p}
                          </Button>
                        )
                      );
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(historyPage + 1)}
                      disabled={!hasMore || isLoadingMore}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* QRコード作成上限アラートモーダル */}
      {showQRLimitModal && subscription && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRLimitModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  QRコード作成上限に達しています
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  現在のプラン（{subscription.planName}）では、QRコードは
                  {subscription.qrCodeLimit}枚まで作成できます。
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 font-medium mb-2">
                新しいQRコードを作成するには：
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">1.</span>
                  <span>
                    既存のQRコードを完全削除する
                    <br />
                    <span className="text-xs text-gray-500">
                      （非表示タブから「完全削除」を選択）
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">2.</span>
                  <span>プランをアップグレードする</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {hiddenChannels.length > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowQRLimitModal(false);
                    setShowHiddenChannels(true);
                  }}
                >
                  非表示タブを確認
                </Button>
              )}
              <Link href="/dashboard/billing" className="flex-1">
                <Button className="w-full gap-2">
                  <CreditCard className="w-4 h-4" />
                  プランを確認
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setShowQRLimitModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* デモアカウント制限モーダル */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  デモアカウントです
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  デモアカウントでは、データの閲覧のみ可能です。
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800">
                QRコードや診断の新規作成・編集を行うには、正式なアカウントでのご登録が必要です。
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowDemoModal(false)}
            >
              閉じる
            </Button>

            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
