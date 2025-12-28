"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  region: string | null;
  city: string | null;
  count: number;
  latitude: number | null;
  longitude: number | null;
  channelId: string | null;
}

interface Channel {
  id: string;
  name: string;
}

interface LocationMapProps {
  locations: Location[];
  channelColorMap?: Record<string, string>;
  channels?: Channel[];
}

// 地図の表示範囲を自動調整するコンポーネント
function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    const validLocations = locations.filter(
      (loc) => loc.latitude && loc.longitude
    );

    if (validLocations.length === 0) return;

    if (validLocations.length === 1) {
      // 1件のみの場合はその位置にズーム
      map.setView(
        [validLocations[0].latitude!, validLocations[0].longitude!],
        10
      );
    } else {
      // 複数の場合は全体が見えるように調整
      const bounds = validLocations.map(
        (loc) => [loc.latitude!, loc.longitude!] as [number, number]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
}

export default function LocationMap({ locations, channelColorMap, channels }: LocationMapProps) {
  // 日本の中心付近（大阪あたり）
  const defaultCenter: [number, number] = [34.6937, 135.5023];

  // 有効な位置データのみ
  const validLocations = locations.filter(
    (loc) => loc.latitude && loc.longitude
  );

  // 最大件数（円のサイズ計算用）
  const maxCount = Math.max(...validLocations.map((loc) => loc.count), 1);

  // チャンネル名を取得するヘルパー
  const getChannelName = (channelId: string | null) => {
    if (!channelId || !channels) return null;
    return channels.find((c) => c.id === channelId)?.name;
  };

  // チャンネルの色を取得するヘルパー
  const getChannelColor = (channelId: string | null) => {
    if (!channelId || !channelColorMap) return "#3b82f6";
    return channelColorMap[channelId] || "#3b82f6";
  };

  // 色を暗くするヘルパー（ボーダー用）
  const darkenColor = (hex: string): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - 40);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
    const b = Math.max(0, (num & 0x0000ff) - 40);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
  };

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      className="h-64 rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locations={validLocations} />
      {validLocations.map((loc, index) => {
        // 件数に応じて円のサイズを調整（最小8、最大30）
        const radius = Math.max(8, Math.min(30, 8 + (loc.count / maxCount) * 22));
        // 件数に応じて透明度を調整
        const opacity = Math.max(0.4, Math.min(0.8, 0.4 + (loc.count / maxCount) * 0.4));

        const fillColor = getChannelColor(loc.channelId);
        const borderColor = darkenColor(fillColor);
        const channelName = getChannelName(loc.channelId);

        return (
          <CircleMarker
            key={`${loc.city}-${loc.channelId}-${index}`}
            center={[loc.latitude!, loc.longitude!]}
            radius={radius}
            fillColor={fillColor}
            fillOpacity={opacity}
            color={borderColor}
            weight={2}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <div className="text-center">
                <div className="font-medium">{loc.city || loc.region}</div>
                {channelName && (
                  <div className="text-xs" style={{ color: fillColor }}>{channelName}</div>
                )}
                <div className="font-bold" style={{ color: fillColor }}>{loc.count}件</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
