"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  PREFECTURE_CENTERS,
  normalizePrefectureName,
} from "@/data/japan-prefectures";

interface LocationData {
  region: string | null;
  city: string | null;
  town: string | null;
  count: number;
}

interface LocationMapProps {
  locations: LocationData[];
}

interface MarkerData {
  key: string;
  position: [number, number];
  region: string;
  city: string;
  town: string | null;
  count: number;
}

// 件数に応じたマーカーの色を返す
function getMarkerColor(count: number, maxCount: number): string {
  if (count === 0) return "#d1d5db"; // gray-300

  const ratio = count / maxCount;

  if (ratio > 0.8) return "#1e40af"; // blue-800
  if (ratio > 0.6) return "#2563eb"; // blue-600
  if (ratio > 0.4) return "#3b82f6"; // blue-500
  if (ratio > 0.2) return "#60a5fa"; // blue-400
  return "#93c5fd"; // blue-300
}

// 件数に応じたマーカーのサイズを返す
function getMarkerRadius(count: number, maxCount: number): number {
  const minRadius = 6;
  const maxRadius = 20;

  if (maxCount <= 1) return minRadius;

  const ratio = count / maxCount;
  return minRadius + (maxRadius - minRadius) * Math.sqrt(ratio);
}

// 文字列からハッシュ値を生成（オフセット計算用）
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// 市区町村名からオフセットを計算（同じ都道府県内で重ならないように）
function getCityOffset(city: string, index: number): [number, number] {
  const hash = hashString(city);
  // -0.3 ~ 0.3 の範囲でオフセット（約30km程度）
  const latOffset = ((hash % 100) / 100 - 0.5) * 0.6;
  const lngOffset = (((hash >> 8) % 100) / 100 - 0.5) * 0.6;

  // インデックスによる追加オフセット（同じ市内の複数マーカー用）
  const angleStep = (2 * Math.PI) / 8;
  const radius = 0.05 * (Math.floor(index / 8) + 1);
  const angle = angleStep * (index % 8);

  return [
    latOffset + radius * Math.sin(angle),
    lngOffset + radius * Math.cos(angle),
  ];
}

export default function LocationMap({ locations }: LocationMapProps) {
  // 日本の中心付近
  const defaultCenter: [number, number] = [36.5, 138.0];

  // マーカーデータを生成
  const markers = useMemo(() => {
    const result: MarkerData[] = [];
    const cityIndexMap: Record<string, number> = {};

    for (const loc of locations) {
      if (!loc.region || !loc.city) continue;

      const prefName = normalizePrefectureName(loc.region);
      const basePosition = PREFECTURE_CENTERS[prefName];

      if (!basePosition) continue;

      // 市区町村内のインデックスを取得
      const cityKey = `${prefName}-${loc.city}`;
      if (!cityIndexMap[cityKey]) {
        cityIndexMap[cityKey] = 0;
      }
      const cityIndex = cityIndexMap[cityKey]++;

      // オフセットを計算
      const [latOffset, lngOffset] = getCityOffset(loc.city, cityIndex);

      const position: [number, number] = [
        basePosition[0] + latOffset,
        basePosition[1] + lngOffset,
      ];

      const key = `${prefName}-${loc.city}-${loc.town || "notown"}-${result.length}`;

      result.push({
        key,
        position,
        region: prefName,
        city: loc.city,
        town: loc.town,
        count: loc.count,
      });
    }

    return result;
  }, [locations]);

  // 最大件数（マーカーサイズ・色の基準）
  const maxCount = useMemo(() => {
    if (markers.length === 0) return 1;
    return Math.max(...markers.map((m) => m.count), 1);
  }, [markers]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={5}
      className="h-64 rounded-lg z-0"
      scrollWheelZoom={false}
      style={{ background: "#f9fafb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <CircleMarker
          key={marker.key}
          center={marker.position}
          radius={getMarkerRadius(marker.count, maxCount)}
          pathOptions={{
            color: getMarkerColor(marker.count, maxCount),
            fillColor: getMarkerColor(marker.count, maxCount),
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-center min-w-[120px]">
              <div className="font-bold text-gray-800">{marker.region}</div>
              <div className="text-sm text-gray-600">{marker.city}</div>
              {marker.town && (
                <div className="text-xs text-gray-500">{marker.town}</div>
              )}
              <div className="text-blue-600 font-bold mt-1">{marker.count}件</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
