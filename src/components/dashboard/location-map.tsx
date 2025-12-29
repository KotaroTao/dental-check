"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  PREFECTURE_CENTERS,
  normalizePrefectureName,
} from "@/data/japan-prefectures";

interface LocationData {
  region: string | null;
  city: string | null;
  town: string | null;
  latitude: number | null;
  longitude: number | null;
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
  hasGPS: boolean;
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

// 件数に応じたマーカーの半径を返す（メートル単位、最小500m = 直径1km）
function getMarkerRadius(count: number, maxCount: number): number {
  const minRadius = 500; // 最小半径 500m（直径1km）
  const maxRadius = 3000; // 最大半径 3km（直径6km）

  if (maxCount <= 1) return minRadius;

  const ratio = count / maxCount;
  return minRadius + (maxRadius - minRadius) * Math.sqrt(ratio);
}

export default function LocationMap({ locations }: LocationMapProps) {
  // 日本の中心付近
  const defaultCenter: [number, number] = [36.5, 138.0];

  // マーカーデータを生成
  const markers = useMemo(() => {
    const result: MarkerData[] = [];

    for (const loc of locations) {
      if (!loc.region || !loc.city) continue;

      const prefName = normalizePrefectureName(loc.region);

      // GPS座標があればそれを使用、なければ都道府県の中心座標にフォールバック
      let position: [number, number];
      let hasGPS = false;

      if (loc.latitude !== null && loc.longitude !== null) {
        position = [loc.latitude, loc.longitude];
        hasGPS = true;
      } else {
        const fallbackPosition = PREFECTURE_CENTERS[prefName];
        if (!fallbackPosition) continue;
        position = fallbackPosition;
      }

      const key = `${prefName}-${loc.city}-${loc.town || "notown"}-${result.length}`;

      result.push({
        key,
        position,
        region: prefName,
        city: loc.city,
        town: loc.town,
        count: loc.count,
        hasGPS,
      });
    }

    return result;
  }, [locations]);

  // 最大件数（マーカーサイズ・色の基準）
  const maxCount = useMemo(() => {
    if (markers.length === 0) return 1;
    return Math.max(...markers.map((m) => m.count), 1);
  }, [markers]);

  // マーカーがある場合、その範囲に合わせてズーム
  const bounds = useMemo(() => {
    if (markers.length === 0) return null;
    const lats = markers.map((m) => m.position[0]);
    const lngs = markers.map((m) => m.position[1]);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [markers]);

  // 中心座標を計算
  const center: [number, number] = useMemo(() => {
    if (!bounds) return defaultCenter;
    return [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLng + bounds.maxLng) / 2,
    ];
  }, [bounds]);

  // ズームレベルを計算
  const zoom = useMemo(() => {
    if (!bounds) return 5;
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff < 0.1) return 13;
    if (maxDiff < 0.5) return 11;
    if (maxDiff < 1) return 10;
    if (maxDiff < 2) return 9;
    if (maxDiff < 5) return 7;
    return 5;
  }, [bounds]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-64 rounded-lg z-0"
      scrollWheelZoom={false}
      style={{ background: "#f9fafb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Circle
          key={marker.key}
          center={marker.position}
          radius={getMarkerRadius(marker.count, maxCount)}
          pathOptions={{
            color: getMarkerColor(marker.count, maxCount),
            fillColor: getMarkerColor(marker.count, maxCount),
            fillOpacity: 0.5,
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
              {!marker.hasGPS && (
                <div className="text-xs text-gray-400 mt-1">※位置は概算</div>
              )}
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}
