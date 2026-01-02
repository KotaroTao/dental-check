"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  X,
  RotateCcw,
  Calendar,
  AlertTriangle,
  Link2,
  MousePointerClick,
  CreditCard,
  MoreVertical,
  Eye,
  ExternalLink,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  adBudget: number | null;
  adPlacement: string | null;
  cpa: number | null;
  cpd: number | null;
  cpc: number | null;
  periodLabel: string;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  userAge: number | null;
  userGender: string | null;
  diagnosisType: string;
  diagnosisTypeSlug: string;
  resultCategory: string | null;
  channelName: string;
  channelId: string;
  area: string;
  ctaType: string | null;
  ctaClickCount: number;
  ctaByType: Record<string, number>;
}

// 履歴用CTAポップオーバーコンポーネント（コンパクト版）
function HistoryCTAPopover({
  ctaClickCount,
  ctaByType,
}: {
  ctaClickCount: number;
  ctaByType: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (ctaClickCount === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
      >
        {ctaClickCount}
      </button>
      {isOpen && (
        <div className="absolute z-[9999] bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[120px] bg-white rounded-lg shadow-lg border p-2">
          <div className="text-[10px] font-medium text-gray-500 mb-1">CTA内訳</div>
          <div className="space-y-0.5">
            {Object.entries(ctaByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs text-gray-600">
                  <span>{CTA_TYPE_NAMES[type] || type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white" />
        </div>
      )}
    </div>
  );
}

interface SubscriptionInfo {
  status: string;
  planType: string;
  planName: string;
  qrCodeLimit: number | null;
  qrCodeCount: number;
  remainingQRCodes: number | null;
  canCreateQR: boolean;
}

// ドロップダウンメニューコンポーネント
function DropdownMenu({
  trigger,
  children,
  align = "right",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // メニューの高さが約250pxと仮定し、下に250px未満のスペースしかない場合は上に開く
      setOpenUp(spaceBelow < 250);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={menuRef}>
      <div ref={triggerRef} onClick={handleToggle}>{trigger}</div>
      {isOpen && (
        <div
          className={`absolute z-[9999] min-w-[160px] bg-white rounded-lg shadow-lg border py-1 ${
            align === "right" ? "right-0" : "left-0"
          } ${openUp ? "bottom-full mb-1" : "top-full mt-1"}`}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// CTAポップオーバーコンポーネント
function CTAPopover({
  ctaCount,
  ctaByType,
}: {
  ctaCount: number;
  ctaByType: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative text-center" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full hover:bg-purple-50 rounded-lg py-1 -my-1 transition-colors"
      >
        <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
          <Target className="w-3 h-3" />
          CTA
        </div>
        <div className="text-xl font-bold text-purple-600">{ctaCount}</div>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 min-w-[140px] bg-white rounded-lg shadow-lg border p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">CTA内訳</div>
          {Object.entries(ctaByType).length === 0 ? (
            <div className="text-xs text-gray-400">クリックなし</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(ctaByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-xs text-gray-600">
                    <span>{CTA_TYPE_NAMES[type] || type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          )}
          {/* 三角形のポインター */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white" />
        </div>
      )}
    </div>
  );
}

// スケルトンコンポーネント
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// QRコードカードコンポーネント
function QRCodeCard({
  channel,
  stats,
  onHide,
  onRestore,
  onPermanentDelete,
  onImageClick,
}: {
  channel: Channel;
  stats?: ChannelStats;
  onHide: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onImageClick: (url: string, name: string) => void;
}) {
  const isExpired = channel.expiresAt && new Date() > new Date(channel.expiresAt);

  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-all duration-200 group">
      {/* カードヘッダー */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* サムネイル */}
          {channel.imageUrl ? (
            <button
              onClick={() => onImageClick(channel.imageUrl!, channel.name)}
              className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <img
                src={channel.imageUrl}
                alt={channel.name}
                className="w-full h-full object-cover"
              />
            </button>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
              {channel.channelType === "link" ? (
                <Link2 className="w-6 h-6 text-blue-500" />
              ) : (
                <QrCode className="w-6 h-6 text-blue-500" />
              )}
            </div>
          )}

          {/* タイトル・ステータス */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{channel.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {channel.channelType === "link" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                  リンク
                </span>
              )}
              {channel.isActive ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  有効
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                  無効
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  期限切れ
                </span>
              )}
            </div>
          </div>

          {/* メニュー */}
          <DropdownMenu
            trigger={
              <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            }
          >
            <Link
              href={`/dashboard/channels/${channel.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              QRコード表示
            </Link>
            <Link
              href={`/dashboard/channels/${channel.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              編集
            </Link>
            <div className="border-t my-1" />
            {channel.isActive ? (
              <button
                onClick={onHide}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="w-4 h-4" />
                非表示にする
              </button>
            ) : (
              <>
                <button
                  onClick={onRestore}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 w-full text-left"
                >
                  <RotateCcw className="w-4 h-4" />
                  復元する
                </button>
                <button
                  onClick={onPermanentDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  完全に削除
                </button>
              </>
            )}
          </DropdownMenu>
        </div>

        {/* 日付情報 */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>作成: {new Date(channel.createdAt).toLocaleDateString("ja-JP")}</span>
          {channel.expiresAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(channel.expiresAt).toLocaleDateString("ja-JP")}まで
            </span>
          )}
        </div>
      </div>

      {/* 統計セクション */}
      {channel.isActive && (
        <div className="border-t bg-gray-50/50">
          {channel.channelType === "link" ? (
            <div className="p-4">
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <MousePointerClick className="w-5 h-5" />
                <span className="text-2xl font-bold">{channel.scanCount}</span>
                <span className="text-sm text-gray-500">クリック</span>
              </div>
            </div>
          ) : stats ? (
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    読み込み
                  </div>
                  <div className="text-xl font-bold text-gray-800">{stats.accessCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" />
                    完了
                  </div>
                  <div className="text-xl font-bold text-emerald-600">{stats.completedCount}</div>
                </div>
                <CTAPopover ctaCount={stats.ctaCount} ctaByType={stats.ctaByType} />
              </div>

              {/* 完了率バー */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">完了率</span>
                  <span className="font-semibold text-blue-600">{stats.completionRate}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.completionRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* 効果測定バッジ */}
              {stats.adBudget && (
                <Link
                  href={`/dashboard/channels/${channel.id}#effectiveness`}
                  className="mt-3 flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span className="text-xs text-blue-700 font-medium">効果測定</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600">
                      CPA ¥{stats.cpa?.toLocaleString() || "-"}
                    </span>
                    <ExternalLink className="w-3 h-3 text-blue-500" />
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-4">
              <Skeleton className="h-16" />
            </div>
          )}
        </div>
      )}

      {/* 詳細リンク（アクティブなチャンネルのみ） */}
      {channel.isActive && (
        <Link
          href={`/dashboard/channels/${channel.id}`}
          className="block border-t px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          詳細を見る
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHiddenChannels, setShowHiddenChannels] = useState(false);

  // サブスクリプション情報
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showQRLimitModal, setShowQRLimitModal] = useState(false);

  // QRコードソート
  type ChannelSortField = "createdAt" | "accessCount" | "completedCount" | "completionRate" | "ctaCount" | "cpa" | "cpd" | "cpc";
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

  // 初回読み込み
  useEffect(() => {
    fetchChannels();
    fetchSubscription();
  }, [fetchChannels, fetchSubscription]);

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
        fetchHistory(0, false);
      } else {
        const data = await response.json();
        alert(data.error || "完全削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to permanently delete channel:", error);
      alert("完全削除に失敗しました");
    }
  };

  // 新規作成ボタンクリック
  const handleNewQRCodeClick = () => {
    if (!subscription) {
      router.push("/dashboard/channels/new");
      return;
    }

    if (!subscription.canCreateQR && subscription.qrCodeLimit !== null) {
      setShowQRLimitModal(true);
      return;
    }

    router.push("/dashboard/channels/new");
  };

  const handleLoadMore = () => {
    fetchHistory(history.length, true);
  };

  // QRコードのソート済みリスト
  const getSortedChannels = (channelList: Channel[]) => {
    return [...channelList].sort((a, b) => {
      if (channelSortField === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

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
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
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
              <option value="accessCount">アクセス順</option>
              <option value="completedCount">診断完了順</option>
              <option value="completionRate">完了率順</option>
              <option value="ctaCount">CTA順</option>
              <option value="cpa">CPA順</option>
              <option value="cpd">CPD順</option>
              <option value="cpc">CPC順</option>
            </select>
          )}
        </div>

        {/* QRコードグリッド */}
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
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayChannels.map((channel) => (
                <QRCodeCard
                  key={channel.id}
                  channel={channel}
                  stats={channelStats[channel.id]}
                  onHide={() => handleHideChannel(channel.id)}
                  onRestore={() => handleRestoreChannel(channel.id)}
                  onPermanentDelete={() => handlePermanentDeleteChannel(channel.id)}
                  onImageClick={(url, name) => setSelectedImage({ url, name })}
                />
              ))}
            </div>
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
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
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
                value={selectedDiagnosisType}
                onChange={(e) => setSelectedDiagnosisType(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white"
              >
                <option value="">全ての診断</option>
                <option value="oral-age">お口年齢診断</option>
                <option value="child-orthodontics">矯正チェック</option>
              </select>
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
            <div className="hidden md:block overflow-x-auto">
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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

            {/* フッター */}
            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-500">
                表示: {history.length} / {totalCount.toLocaleString()}件
              </div>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
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

      {/* クイックスタートガイド */}
      {channels.length === 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">はじめての方へ</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold mb-3">
                1
              </div>
              <h3 className="font-semibold mb-1">QRコードを作成</h3>
              <p className="text-sm text-gray-600">
                「チラシ①」「医院前看板」など、計測したいQRコードを登録
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold mb-3">
                2
              </div>
              <h3 className="font-semibold mb-1">QRコードを印刷</h3>
              <p className="text-sm text-gray-600">
                発行されたQRコードをチラシや看板に印刷
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold mb-3">
                3
              </div>
              <h3 className="font-semibold mb-1">効果を確認</h3>
              <p className="text-sm text-gray-600">
                ダッシュボードでQRコード別の効果を比較
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 画像モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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
    </div>
  );
}
