"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, TrendingUp } from "lucide-react";

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
  count: number;
  latitude: number | null;
  longitude: number | null;
}

interface LocationSectionProps {
  period: string;
  channelId: string;
  customStartDate?: string;
  customEndDate?: string;
}

export function LocationSection({
  period,
  channelId,
  customStartDate,
  customEndDate,
}: LocationSectionProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("period", period);
        if (channelId) params.set("channelId", channelId);
        if (period === "custom" && customStartDate && customEndDate) {
          params.set("startDate", customStartDate);
          params.set("endDate", customEndDate);
        }

        const response = await fetch(`/api/dashboard/locations?${params}`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [period, channelId, customStartDate, customEndDate]);

  // 位置情報があるデータのみ抽出
  const validLocations = locations.filter(
    (loc) => loc.latitude && loc.longitude && loc.city
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          診断実施エリア
        </h2>
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

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          診断実施エリア
        </h2>
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>この期間のエリアデータはありません</p>
          <p className="text-sm mt-1">診断が実施されると、ここに地域別の統計が表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        診断実施エリア
        <span className="text-sm font-normal text-gray-500">
          （{total}件中 位置特定 {validLocations.length}件）
        </span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 地図 */}
        <div>
          {validLocations.length > 0 ? (
            <LocationMap locations={validLocations} />
          ) : (
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              位置データなし
            </div>
          )}
        </div>

        {/* リスト */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            エリア別 TOP10
          </h3>
          <div className="space-y-2">
            {locations.slice(0, 10).map((loc, index) => {
              const maxCount = locations[0]?.count || 1;
              const percentage = (loc.count / maxCount) * 100;

              return (
                <div key={`${loc.region}-${loc.city}-${index}`} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-5">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {loc.city || loc.region || "不明"}
                      </span>
                      <span className="text-sm text-gray-500">{loc.count}件</span>
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

          {locations.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              データがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
