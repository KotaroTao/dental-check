"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Check, SquareCheck, Square, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  PREFECTURE_CENTERS,
  normalizePrefectureName,
} from "@/data/japan-prefectures";

// 初期表示件数
const INITIAL_DISPLAY_COUNT = 10;

// Leafletはクライアントサイドのみで読み込む
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-gray-400">地図を読み込み中...</span>
    </div>
  ),
});

interface LocationData {
  region: string | null;
  city: string | null;
  town: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
  channelId: string | null;
}

interface Channel {
  id: string;
  name: string;
  isActive: boolean;
}

interface LocationSectionProps {
  period: string;
  channels: Channel[];
  customStartDate?: string;
  customEndDate?: string;
}

// チャンネルごとの色を定義（最大10色）
const CHANNEL_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
];

export function LocationSection({
  period,
  channels,
  customStartDate,
  customEndDate,
}: LocationSectionProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clinicCenter, setClinicCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hotspot, setHotspot] = useState<{
    latitude: number;
    longitude: number;
    region: string;
    city: string;
    town: string | null;
    count: number;
  } | null>(null);

  // 地図でフォーカスする地域
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // リスト展開状態
  const [isExpanded, setIsExpanded] = useState(false);

  // 選択されたチャンネルID（初期値は全てのアクティブチャンネル）
  const activeChannels = channels.filter((c) => c.isActive);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(
    activeChannels.map((c) => c.id)
  );

  // チャンネルが変更されたら選択を更新
  useEffect(() => {
    const activeIds = channels.filter((c) => c.isActive).map((c) => c.id);
    setSelectedChannelIds((prev) => {
      // 既存の選択からアクティブでないものを除外
      const filtered = prev.filter((id) => activeIds.includes(id));
      // 新しく追加されたチャンネルがあれば追加
      const newIds = activeIds.filter((id) => !prev.includes(id));
      return [...filtered, ...newIds];
    });
  }, [channels]);

  // チャンネルIDと色のマッピング
  const channelColorMap: Record<string, string> = {};
  activeChannels.forEach((channel, index) => {
    channelColorMap[channel.id] = CHANNEL_COLORS[index % CHANNEL_COLORS.length];
  });

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const selectAll = () => {
    setSelectedChannelIds(activeChannels.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedChannelIds([]);
  };

  const isAllSelected = selectedChannelIds.length === activeChannels.length;

  // ヘルプポップオーバーの表示状態
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      if (selectedChannelIds.length === 0) {
        setLocations([]);
        setTotal(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("period", period);
        params.set("channelIds", selectedChannelIds.join(","));
        if (period === "custom" && customStartDate && customEndDate) {
          params.set("startDate", customStartDate);
          params.set("endDate", customEndDate);
        }

        const response = await fetch(`/api/dashboard/locations?${params}`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
          setTotal(data.total || 0);
          setClinicCenter(data.clinicCenter || null);
          setHotspot(data.hotspot || null);
          // データ変更時は展開状態と選択をリセット
          setIsExpanded(false);
          setSelectedLocation(null);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [period, selectedChannelIds, customStartDate, customEndDate]);

  // 都道府県情報があるデータのみ抽出
  const validLocations = locations.filter(
    (loc) => loc.region
  );

  // チャンネル選択UI
  const ChannelSelector = () => (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm text-gray-600 font-medium">QRコード:</span>
        <button
          onClick={isAllSelected ? deselectAll : selectAll}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
        >
          {isAllSelected ? (
            <>
              <SquareCheck className="w-3 h-3" />
              全解除
            </>
          ) : (
            <>
              <Square className="w-3 h-3" />
              全選択
            </>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeChannels.map((channel) => {
          const isSelected = selectedChannelIds.includes(channel.id);
          const color = channelColorMap[channel.id];
          return (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
                isSelected
                  ? "border-current bg-opacity-10"
                  : "border-gray-200 text-gray-400 bg-gray-50"
              }`}
              style={isSelected ? { color, backgroundColor: `${color}15` } : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isSelected ? color : "#d1d5db" }}
              />
              {channel.name}
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          QR読み込みエリア
        </h2>
        <ChannelSelector />
        <div className="animate-pulse">
          <div className="h-64 bg-gray-100 rounded-lg mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (locations.length === 0 || selectedChannelIds.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          QR読み込みエリア
        </h2>
        <ChannelSelector />
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>{selectedChannelIds.length === 0 ? "QRコードを選択してください" : "この期間のエリアデータはありません"}</p>
          <p className="text-sm mt-1">QRコードが読み込まれると、ここに地域別の統計が表示されます</p>
        </div>
      </div>
    );
  }

  // 町丁目別に集計（同じ町丁目の複数チャンネルをまとめる）
  const townAggregated: Record<string, { region: string | null; city: string | null; town: string | null; count: number }> = {};
  for (const loc of locations) {
    // 町丁目がある場合は町丁目レベルで集計、なければ市区町村レベル
    const key = loc.town
      ? `${loc.region}-${loc.city}-${loc.town}`
      : `${loc.region}-${loc.city}`;
    if (!townAggregated[key]) {
      townAggregated[key] = {
        region: loc.region,
        city: loc.city,
        town: loc.town,
        count: 0,
      };
    }
    townAggregated[key].count += loc.count;
  }
  const aggregatedLocations = Object.values(townAggregated).sort((a, b) => b.count - a.count);

  // 表示する地域（展開状態に応じて制限）
  const displayedLocations = isExpanded
    ? aggregatedLocations
    : aggregatedLocations.slice(0, INITIAL_DISPLAY_COUNT);

  const remainingCount = aggregatedLocations.length - INITIAL_DISPLAY_COUNT;
  const hasMore = remainingCount > 0;

  // 地域クリック時のハンドラー
  const handleLocationClick = (loc: { region: string | null; city: string | null; town: string | null }) => {
    if (!loc.region || !loc.city) return;

    // 元のlocationsからGPS座標を探す
    const original = locations.find(
      (l) => l.region === loc.region && l.city === loc.city && l.town === loc.town
    );

    if (original?.latitude && original?.longitude) {
      setSelectedLocation({
        latitude: original.latitude,
        longitude: original.longitude,
      });
    } else {
      // GPS座標がない場合は都道府県中心座標を使用
      const prefCenter = PREFECTURE_CENTERS[normalizePrefectureName(loc.region)];
      if (prefCenter) {
        setSelectedLocation({
          latitude: prefCenter[0],
          longitude: prefCenter[1],
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          QR読み込みエリア
          <span className="text-sm font-normal text-gray-500">
            （{total}件中 位置特定 {validLocations.length}件）
          </span>
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {showHelp && (
            <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white rounded-lg shadow-xl border text-sm text-gray-600">
              <p>利用者のプライバシー保護のため、詳細な住所は記録せず、おおまかな地域（町丁目レベル）を統計データとして表示しています。</p>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      </div>

      <ChannelSelector />

      <div className="grid md:grid-cols-2 gap-6">
        {/* 地図（都道府県ポリゴン表示） */}
        <div>
          {validLocations.length > 0 ? (
            <LocationMap
              locations={validLocations}
              clinicCenter={clinicCenter}
              hotspot={hotspot}
              selectedLocation={selectedLocation}
            />
          ) : (
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              位置データなし
            </div>
          )}
        </div>

        {/* リスト */}
        <div className="max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {displayedLocations.map((loc, index) => {
              const maxCount = aggregatedLocations[0]?.count || 1;
              const percentage = (loc.count / maxCount) * 100;

              // 表示名を決定（町丁目 > 市区町村 > 都道府県）
              const displayName = loc.town
                ? `${loc.city} ${loc.town}`
                : loc.city || loc.region || "不明";

              return (
                <div key={`${loc.region}-${loc.city}-${loc.town}-${index}`} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-5">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => handleLocationClick(loc)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate text-left"
                        title={`${displayName}を地図で表示`}
                      >
                        {displayName}
                      </button>
                      <span className="text-sm text-gray-500 ml-2 whitespace-nowrap">{loc.count}件</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* もっと見る/折りたたむボタン */}
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full py-2 mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 border-t"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  折りたたむ
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  残り {remainingCount}件を表示
                </>
              )}
            </button>
          )}

          {aggregatedLocations.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              データがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
