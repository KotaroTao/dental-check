"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  QrCode,
  Plus,
  Settings,
  Trash2,
  Download,
  ArrowUpDown,
  Image as ImageIcon,
  X,
  RotateCcw,
  Info,
  Calendar,
  AlertTriangle,
  Link2,
  MousePointerClick,
} from "lucide-react";
import { LocationSection } from "@/components/dashboard/location-section";

// 期間の選択肢
const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
  { value: "custom", label: "期間指定" },
];


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

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  diagnosisTypeName: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: string | null;
  scanCount: number;
  createdAt: string;
}

interface ChannelStats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaRate: number;
  ctaByType: Record<string, number>;
  genderByType: Record<string, number>;
  ageRanges: Record<string, number>;
  accessByDate: { date: string; count: number }[];
  // 広告効果測定
  adBudget: number | null;
  adPlacement: string | null;
  cpa: number | null;
  cpd: number | null;
  cpc: number | null;
  // 期間ラベル
  periodLabel: string;
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
  area: string;
  ctaType: string | null;
  ctaClickCount: number;
  ctaByType: Record<string, number>;
}

// ポップオーバーコンポーネント
function Popover({
  trigger,
  children,
  className = "",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute z-50 bg-white rounded-lg shadow-xl border p-3 min-w-[180px] ${className}`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// スケルトンコンポーネント
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHiddenChannels, setShowHiddenChannels] = useState(false);
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(null);

  // QRコードソート
  type ChannelSortField = "default" | "accessCount" | "completedCount" | "completionRate" | "ctaCount" | "cpa" | "cpd" | "cpc";
  const [channelSortField, setChannelSortField] = useState<ChannelSortField>("default");

  // ドラッグ＆ドロップ
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);

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
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

  // QRコード一覧取得
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

  // 履歴データ取得
  const fetchHistory = useCallback(
    async (offset = 0, append = false) => {
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
    },
    [period, selectedChannelId, selectedDiagnosisType, customStartDate, customEndDate]
  );

  // 初回読み込み
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // フィルター変更時
  useEffect(() => {
    fetchChannelStats();
    fetchHistory(0, false);
  }, [fetchChannelStats, fetchHistory]);

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
        fetchHistory(0, false);
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
        fetchHistory(0, false);
      }
    } catch (error) {
      console.error("Failed to restore channel:", error);
    }
  };

  const handleLoadMore = () => {
    fetchHistory(history.length, true);
  };

  // ドラッグ＆ドロップ
  const handleDragStart = (e: React.DragEvent, channelId: string) => {
    setDraggedChannelId(channelId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetChannelId: string) => {
    e.preventDefault();
    if (!draggedChannelId || draggedChannelId === targetChannelId) {
      setDraggedChannelId(null);
      return;
    }

    const activeChannelList = channels.filter((c) => c.isActive);
    const draggedIndex = activeChannelList.findIndex((c) => c.id === draggedChannelId);
    const targetIndex = activeChannelList.findIndex((c) => c.id === targetChannelId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedChannelId(null);
      return;
    }

    // 新しい順序を作成
    const newOrder = [...activeChannelList];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // ローカル状態を更新
    const hiddenChannels = channels.filter((c) => !c.isActive);
    setChannels([...newOrder, ...hiddenChannels]);
    setDraggedChannelId(null);

    // サーバーに保存
    try {
      await fetch("/api/channels/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: newOrder.map((c) => c.id) }),
      });
    } catch (error) {
      console.error("Failed to reorder channels:", error);
    }
  };

  const handleDragEnd = () => {
    setDraggedChannelId(null);
  };

  // QRコードのソート済みリスト
  const getSortedChannels = (channelList: Channel[]) => {
    if (channelSortField === "default") {
      return channelList;
    }

    return [...channelList].sort((a, b) => {
      const statsA = channelStats[a.id];
      const statsB = channelStats[b.id];
      if (!statsA || !statsB) return 0;

      switch (channelSortField) {
        case "accessCount":
          return statsB.accessCount - statsA.accessCount;
        case "completedCount":
          return statsB.completedCount - statsA.completedCount;
        case "completionRate":
          return statsB.completionRate - statsA.completionRate;
        case "ctaCount":
          return statsB.ctaCount - statsA.ctaCount;
        // CPA/CPD/CPC: 低い順（効率が良い順）。nullは最後に
        case "cpa":
          if (statsA.cpa === null && statsB.cpa === null) return 0;
          if (statsA.cpa === null) return 1;
          if (statsB.cpa === null) return -1;
          return statsA.cpa - statsB.cpa;
        case "cpd":
          if (statsA.cpd === null && statsB.cpd === null) return 0;
          if (statsA.cpd === null) return 1;
          if (statsB.cpd === null) return -1;
          return statsA.cpd - statsB.cpd;
        case "cpc":
          if (statsA.cpc === null && statsB.cpc === null) return 0;
          if (statsA.cpc === null) return 1;
          if (statsB.cpc === null) return -1;
          return statsA.cpc - statsB.cpc;
        default:
          return 0;
      }
    });
  };

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
        ["日時", "年齢", "性別", "診断タイプ", "QRコード", "エリア", "CTAクリック回数", "CTA内訳"],
      ];

      data.history.forEach((item: HistoryItem) => {
        // CTA内訳を文字列に変換
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

  // ローディング
  if (isLoading && channels.length === 0) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeChannels = channels.filter((c) => c.isActive);
  const hiddenChannels = channels.filter((c) => !c.isActive);
  const sortedActiveChannels = getSortedChannels(activeChannels);
  const displayChannels = showHiddenChannels ? hiddenChannels : sortedActiveChannels;

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm bg-white"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* QRコードセクション */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QRコード
          </h2>
          <Link href="/dashboard/channels/new">
            <Button className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              新規作成
            </Button>
          </Link>
        </div>

        {/* タブとソート */}
        <div className="flex items-center justify-between border-b px-6">
          <div className="flex">
            <button
              onClick={() => setShowHiddenChannels(false)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                !showHiddenChannels
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              有効 ({activeChannels.length})
            </button>
            <button
              onClick={() => setShowHiddenChannels(true)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${
                showHiddenChannels
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              非表示 ({hiddenChannels.length})
            </button>
          </div>
          {!showHiddenChannels && activeChannels.length > 1 && (
            <select
              value={channelSortField}
              onChange={(e) => setChannelSortField(e.target.value as ChannelSortField)}
              className="px-2 py-1 border rounded text-xs bg-white"
            >
              <option value="default">並び順: 手動</option>
              <option value="accessCount">QR読み込み順</option>
              <option value="completedCount">診断完了順</option>
              <option value="completionRate">完了率順</option>
              <option value="ctaCount">CTA順</option>
              <option value="cpa">CPA順（アクセス単価）</option>
              <option value="cpd">CPD順（診断完了単価）</option>
              <option value="cpc">CPC順（CTAクリック単価）</option>
            </select>
          )}
        </div>

        {displayChannels.length === 0 ? (
          <div className="p-12 text-center">
            <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showHiddenChannels ? "非表示のQRコードはありません" : "まだQRコードがありません"}
            </h3>
            {!showHiddenChannels && (
              <Link href="/dashboard/channels/new">
                <Button>最初のQRコードを作成する</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {displayChannels.map((channel) => {
              const stats = channelStats[channel.id];
              const isExpanded = expandedChannelId === channel.id;

              const isDragging = draggedChannelId === channel.id;
              const canDrag = channel.isActive && channelSortField === "default";

              return (
                <div
                  key={channel.id}
                  className={`p-4 hover:bg-gray-50 ${isDragging ? "opacity-50 bg-blue-50" : ""} ${canDrag ? "cursor-grab" : ""}`}
                  draggable={canDrag}
                  onDragStart={(e) => canDrag && handleDragStart(e, channel.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => canDrag && handleDrop(e, channel.id)}
                  onDragEnd={handleDragEnd}
                >
                  {/* カードヘッダー */}
                  <div className="flex items-start gap-3 mb-3">
                    {channel.imageUrl ? (
                      <button
                        onClick={() => setSelectedImage({ url: channel.imageUrl!, name: channel.name })}
                        className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80"
                      >
                        <img src={channel.imageUrl} alt={channel.name} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.channelType === "link" && (
                          <span className="shrink-0 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-0.5">
                            <Link2 className="w-3 h-3" />
                            リンク
                          </span>
                        )}
                        {channel.isActive ? (
                          <span className="shrink-0 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            有効
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            無効
                          </span>
                        )}
                        {channel.expiresAt && new Date() > new Date(channel.expiresAt) && (
                          <span className="shrink-0 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            有効期限切れ
                          </span>
                        )}
                        {stats?.adBudget && (
                          <Link href={`/dashboard/channels/${channel.id}#effectiveness`} className="shrink-0">
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-0.5 hover:bg-blue-200 transition-colors">
                              効果測定
                            </span>
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                          作成日: {new Date(channel.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                        {channel.channelType === "link" && (
                          <span className="flex items-center gap-1 text-xs text-purple-600">
                            <MousePointerClick className="w-3 h-3" />
                            {channel.scanCount}回
                          </span>
                        )}
                        {channel.expiresAt && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(channel.expiresAt).toLocaleDateString("ja-JP")}まで
                          </span>
                        )}
                        {stats?.periodLabel && (
                          <span className="text-xs text-gray-400">
                            掲載: {stats.periodLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/dashboard/channels/${channel.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <QrCode className="w-4 h-4" />
                          QRコード表示
                        </Button>
                      </Link>
                      <Link href={`/dashboard/channels/${channel.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      {channel.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHideChannel(channel.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreChannel(channel.id)}
                          className="text-green-500 hover:text-green-700 hover:bg-green-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 統計カード */}
                  {channel.isActive && channel.channelType === "link" && (
                    <div className="grid grid-cols-1 gap-2 text-center">
                      <div className="bg-purple-50 rounded-lg py-3 px-4 flex items-center justify-center gap-3">
                        <MousePointerClick className="w-5 h-5 text-purple-600" />
                        <div>
                          <div className="text-xs text-gray-500">QR読み込み</div>
                          <div className="text-2xl font-bold text-purple-600">{channel.scanCount}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {channel.isActive && channel.channelType === "diagnosis" && stats && (
                    <>
                      {/* PC版: ホバーでポップオーバー */}
                      <div className={`hidden md:grid gap-2 text-center ${stats.adBudget ? "grid-cols-7" : "grid-cols-5"}`}>
                        <Popover
                          trigger={
                            <div className="bg-gray-50 rounded-lg py-2 px-3 hover:bg-blue-50 transition-colors">
                              <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                                QR読み込み <Info className="w-3 h-3" />
                              </div>
                              <div className="text-lg font-bold text-gray-800">{stats.accessCount}</div>
                            </div>
                          }
                          className="left-0 top-full mt-2"
                        >
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-2">日別アクセス</div>
                            {stats.accessByDate.length === 0 ? (
                              <div className="text-gray-400">データなし</div>
                            ) : (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {stats.accessByDate.map((item) => (
                                  <div key={item.date} className="flex justify-between text-gray-600">
                                    <span>{new Date(item.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                                    <span>{item.count}回</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Popover>
                        <Popover
                          trigger={
                            <div className="bg-gray-50 rounded-lg py-2 px-3 hover:bg-blue-50 transition-colors">
                              <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                                診断完了 <Info className="w-3 h-3" />
                              </div>
                              <div className="text-lg font-bold text-green-600">{stats.completedCount}</div>
                            </div>
                          }
                          className="left-1/2 -translate-x-1/2 top-full mt-2"
                        >
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-2">年齢・性別分布</div>
                            <div className="space-y-1 mb-2">
                              {Object.entries(stats.genderByType).map(([g, c]) =>
                                c > 0 ? (
                                  <div key={g} className="flex justify-between text-gray-600">
                                    <span>{GENDER_NAMES[g]}</span>
                                    <span>{c}人</span>
                                  </div>
                                ) : null
                              )}
                            </div>
                            <div className="border-t pt-2 space-y-1">
                              {Object.entries(stats.ageRanges).map(([a, c]) =>
                                c > 0 ? (
                                  <div key={a} className="flex justify-between text-gray-600">
                                    <span>{AGE_RANGE_NAMES[a]}</span>
                                    <span>{c}人</span>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </div>
                        </Popover>
                        <div className="bg-gray-50 rounded-lg py-2 px-3">
                          <div className="text-xs text-gray-500 mb-0.5">完了率</div>
                          <div className="text-lg font-bold text-blue-600">{stats.completionRate}%</div>
                        </div>
                        <Popover
                          trigger={
                            <div className="bg-gray-50 rounded-lg py-2 px-3 hover:bg-purple-50 transition-colors">
                              <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                                CTA <Info className="w-3 h-3" />
                              </div>
                              <div className="text-lg font-bold text-purple-600">{stats.ctaCount}</div>
                            </div>
                          }
                          className="right-0 top-full mt-2"
                        >
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-2">CTA内訳</div>
                            <div className="space-y-1">
                              {Object.entries(stats.ctaByType).length === 0 ? (
                                <div className="text-gray-400">クリックなし</div>
                              ) : (
                                Object.entries(stats.ctaByType)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([type, count]) => (
                                    <div key={type} className="flex justify-between text-gray-600">
                                      <span>{CTA_TYPE_NAMES[type] || type}</span>
                                      <span>{count}</span>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </Popover>
                        {stats.adBudget ? (
                          <>
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`}>
                              <div className="bg-blue-50 rounded-lg py-2 px-3 hover:bg-blue-100 transition-colors h-full flex flex-col justify-center">
                                <div className="text-xs text-blue-600 mb-0.5 flex items-center justify-center gap-1">
                                  CPA
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                  {stats.cpa ? `¥${stats.cpa.toLocaleString()}` : "-"}
                                </div>
                                <div className="text-[10px] text-blue-500">アクセス単価</div>
                              </div>
                            </Link>
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`}>
                              <div className="bg-green-50 rounded-lg py-2 px-3 hover:bg-green-100 transition-colors h-full flex flex-col justify-center">
                                <div className="text-xs text-green-600 mb-0.5 flex items-center justify-center gap-1">
                                  CPD
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                  {stats.cpd ? `¥${stats.cpd.toLocaleString()}` : "-"}
                                </div>
                                <div className="text-[10px] text-green-500">診断完了単価</div>
                              </div>
                            </Link>
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`}>
                              <div className="bg-purple-50 rounded-lg py-2 px-3 hover:bg-purple-100 transition-colors h-full flex flex-col justify-center">
                                <div className="text-xs text-purple-600 mb-0.5 flex items-center justify-center gap-1">
                                  CPC
                                </div>
                                <div className="text-lg font-bold text-purple-600">
                                  {stats.cpc ? `¥${stats.cpc.toLocaleString()}` : "-"}
                                </div>
                                <div className="text-[10px] text-purple-500">CTAクリック単価</div>
                              </div>
                            </Link>
                          </>
                        ) : (
                          <Link href={`/dashboard/channels/${channel.id}/edit#effectiveness`}>
                            <div className="bg-gray-50 rounded-lg py-2 px-3 hover:bg-gray-100 transition-colors h-full flex flex-col justify-center">
                              <div className="text-xs text-gray-500 mb-0.5">効果測定</div>
                              <div className="text-sm font-medium text-blue-600 hover:underline">設定する</div>
                            </div>
                          </Link>
                        )}
                      </div>

                      {/* モバイル版: タップで展開 */}
                      <div className="md:hidden">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg py-2 px-1">
                            <div className="text-[10px] text-gray-500">QR読み込み</div>
                            <div className="text-base font-bold text-gray-800">{stats.accessCount}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-2 px-1">
                            <div className="text-[10px] text-gray-500">診断完了</div>
                            <div className="text-base font-bold text-green-600">{stats.completedCount}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-2 px-1">
                            <div className="text-[10px] text-gray-500">完了率</div>
                            <div className="text-base font-bold text-blue-600">{stats.completionRate}%</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-2 px-1">
                            <div className="text-[10px] text-gray-500">CTA</div>
                            <div className="text-base font-bold text-purple-600">{stats.ctaCount}</div>
                          </div>
                        </div>
                        {stats.adBudget ? (
                          <div className="grid grid-cols-3 gap-2 text-center mt-2">
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`} className="bg-blue-50 rounded-lg py-2 px-1">
                              <div className="text-[10px] text-blue-600">CPA（アクセス）</div>
                              <div className="text-base font-bold text-blue-600">
                                {stats.cpa ? `¥${stats.cpa.toLocaleString()}` : "-"}
                              </div>
                            </Link>
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`} className="bg-green-50 rounded-lg py-2 px-1">
                              <div className="text-[10px] text-green-600">CPD（診断）</div>
                              <div className="text-base font-bold text-green-600">
                                {stats.cpd ? `¥${stats.cpd.toLocaleString()}` : "-"}
                              </div>
                            </Link>
                            <Link href={`/dashboard/channels/${channel.id}#effectiveness`} className="bg-purple-50 rounded-lg py-2 px-1">
                              <div className="text-[10px] text-purple-600">CPC（CTA）</div>
                              <div className="text-base font-bold text-purple-600">
                                {stats.cpc ? `¥${stats.cpc.toLocaleString()}` : "-"}
                              </div>
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Link href={`/dashboard/channels/${channel.id}/edit#effectiveness`} className="block bg-gray-50 rounded-lg py-2 px-1 text-center">
                              <div className="text-[10px] text-gray-500">効果測定</div>
                              <div className="text-[10px] font-medium text-blue-600">設定する</div>
                            </Link>
                          </div>
                        )}
                        <button
                          onClick={() => setExpandedChannelId(isExpanded ? null : channel.id)}
                          className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1"
                        >
                          {isExpanded ? "詳細を隠す" : "詳細を表示"}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {isExpanded && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-2 space-y-3 text-sm">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">年齢・性別分布</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.genderByType).map(([g, c]) =>
                                  c > 0 ? (
                                    <span key={g} className="text-gray-600">
                                      {GENDER_NAMES[g]}: {c}人
                                    </span>
                                  ) : null
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(stats.ageRanges).map(([a, c]) =>
                                  c > 0 ? (
                                    <span key={a} className="text-gray-600">
                                      {AGE_RANGE_NAMES[a]}: {c}
                                    </span>
                                  ) : null
                                )}
                              </div>
                            </div>
                            <div className="border-t pt-2">
                              <div className="font-medium text-gray-700 mb-1">CTA内訳</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.ctaByType).length === 0 ? (
                                  <span className="text-gray-400">クリックなし</span>
                                ) : (
                                  Object.entries(stats.ctaByType)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([type, count]) => (
                                      <span key={type} className="text-gray-600">
                                        {CTA_TYPE_NAMES[type] || type}: {count}
                                      </span>
                                    ))
                                )}
                              </div>
                            </div>
                            <div className="border-t pt-2">
                              <div className="font-medium text-gray-700 mb-1">日別アクセス</div>
                              <div className="flex flex-wrap gap-2">
                                {stats.accessByDate.length === 0 ? (
                                  <span className="text-gray-400">データなし</span>
                                ) : (
                                  stats.accessByDate.map((item) => (
                                    <span key={item.date} className="text-gray-600">
                                      {new Date(item.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}: {item.count}回
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
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
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-bold">QR読み込み履歴</h2>
            <div className="flex flex-wrap gap-2 ml-auto">
              {/* 期間指定 */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {period === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1.5 border rounded-md text-sm bg-white"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1.5 border rounded-md text-sm bg-white"
                  />
                </div>
              )}
              <select
                value={selectedDiagnosisType}
                onChange={(e) => setSelectedDiagnosisType(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                <option value="">全ての診断</option>
                <option value="oral-age">お口年齢診断</option>
                <option value="child-orthodontics">矯正チェック</option>
              </select>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
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
                onClick={exportHistoryToCSV}
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
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">履歴がありません</h3>
          </div>
        ) : (
          <>
            {/* PC用テーブル */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("createdAt")}>
                      <span className="flex items-center">日時<SortIcon field="createdAt" /></span>
                    </th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("userAge")}>
                      <span className="flex items-center justify-center">年齢<SortIcon field="userAge" /></span>
                    </th>
                    <th className="text-center px-2 py-3 text-sm font-medium text-gray-500">性別</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">診断</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">QRコード</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">エリア</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="px-2 py-4 text-center text-sm text-gray-700">{item.userAge !== null ? `${item.userAge}歳` : "-"}</td>
                      <td className="px-2 py-4 text-center text-sm text-gray-700">{item.userGender || "-"}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">{item.diagnosisType}</span>
                      </td>
                      <td className="px-4 py-4 text-sm">{item.channelName}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{item.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル用カード */}
            <div className="md:hidden divide-y">
              {sortedHistory.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-500">{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">{item.userAge !== null ? `${item.userAge}歳` : "-"} / {item.userGender || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{item.diagnosisType}</span>
                    <span className="text-sm text-gray-600">{item.channelName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">エリア: </span>
                    <span className="text-gray-900">{item.area}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">該当: {totalCount.toLocaleString()}件</div>
              {hasMore && (
                <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore} className="gap-2">
                  {isLoadingMore ? "読み込み中..." : "もっと見る"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* クイックスタートガイド */}
      {channels.length === 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h2 className="text-lg font-bold text-blue-900 mb-4">はじめての方へ</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">1</div>
              <h3 className="font-medium mb-1">QRコードを作成</h3>
              <p className="text-sm text-gray-600">「チラシ①」「医院前看板」など、計測したいQRコードを登録</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">2</div>
              <h3 className="font-medium mb-1">QRコードを印刷</h3>
              <p className="text-sm text-gray-600">発行されたQRコードをチラシや看板に印刷</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">3</div>
              <h3 className="font-medium mb-1">効果を確認</h3>
              <p className="text-sm text-gray-600">ダッシュボードでQRコード別の効果を比較</p>
            </div>
          </div>
        </div>
      )}

      {/* 画像モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage.url} alt={selectedImage.name} className="max-w-full max-h-[90vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
