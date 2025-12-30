"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, useMap } from "react-leaflet";
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

interface HotspotData {
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  town?: string | null;
  count: number;
}

interface SelectedLocation {
  latitude: number;
  longitude: number;
}

interface LocationMapProps {
  locations: LocationData[];
  clinicCenter?: { latitude: number; longitude: number } | null;
  hotspot?: HotspotData | null;
  selectedLocation?: SelectedLocation | null;
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

// 最小半径（メートル）- 直径1km = 半径500m
const MIN_RADIUS_METERS = 500;

// ズームレベルに応じた基本マーカーサイズを返す（メートル単位）
function getBaseRadius(zoom: number): number {
  // ズームアウト時は大きく、ズームイン時は最小1km（500m半径）を保証
  if (zoom <= 5) return 50000;  // 日本全体: 100km直径
  if (zoom <= 7) return 20000;  // 地方レベル: 40km直径
  if (zoom <= 9) return 8000;   // 県レベル: 16km直径
  if (zoom <= 11) return 3000;  // 市レベル: 6km直径
  if (zoom <= 13) return 1000;  // 区レベル: 2km直径
  return MIN_RADIUS_METERS;     // 町丁目レベル: 最小1km直径
}

// 件数に応じたマーカーの半径を返す（メートル単位、最小500m保証）
function getMarkerRadius(count: number, maxCount: number, zoom: number): number {
  const baseRadius = getBaseRadius(zoom);
  const maxRadius = baseRadius * 2;

  if (maxCount <= 1) return Math.max(baseRadius, MIN_RADIUS_METERS);

  const ratio = count / maxCount;
  const radius = baseRadius + (maxRadius - baseRadius) * Math.sqrt(ratio);
  return Math.max(radius, MIN_RADIUS_METERS);
}

// ズームレベル監視コンポーネント
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

// 地図の中心を動的に変更するコンポーネント
function MapController({
  selectedLocation,
}: {
  selectedLocation: SelectedLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(
        [selectedLocation.latitude, selectedLocation.longitude],
        13, // ズームレベル13（区・町レベル）
        { duration: 0.5 } // アニメーション0.5秒
      );
    }
  }, [selectedLocation, map]);

  return null;
}

// マーカー描画コンポーネント
function MapMarkers({
  markers,
  maxCount,
  zoom,
}: {
  markers: MarkerData[];
  maxCount: number;
  zoom: number;
}) {
  return (
    <>
      {markers.map((marker) => (
        <Circle
          key={marker.key}
          center={marker.position}
          radius={getMarkerRadius(marker.count, maxCount, zoom)}
          pathOptions={{
            color: getMarkerColor(marker.count, maxCount),
            fillColor: getMarkerColor(marker.count, maxCount),
            fillOpacity: 0.6,
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
    </>
  );
}

export default function LocationMap({ locations, clinicCenter, hotspot, selectedLocation }: LocationMapProps) {
  // 優先順位: 1. 最多読み込み地域 2. クリニック住所 3. 日本の中心
  const defaultCenter: [number, number] = useMemo(() => {
    if (hotspot) return [hotspot.latitude, hotspot.longitude];
    if (clinicCenter) return [clinicCenter.latitude, clinicCenter.longitude];
    return [36.5, 138.0];
  }, [hotspot, clinicCenter]);

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
    // hotspotがある場合は最多読み込み地域を中心に
    if (hotspot) return [hotspot.latitude, hotspot.longitude];
    if (!bounds) return defaultCenter;
    return [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLng + bounds.maxLng) / 2,
    ];
  }, [bounds, hotspot, defaultCenter]);

  // 初期ズームレベルを計算
  const initialZoom = useMemo(() => {
    // hotspotがある場合は市レベル（11）で表示
    if (hotspot) return 11;

    if (!bounds) {
      // マーカーがない場合、クリニック座標があれば市レベル（11）、なければ日本全体（5）
      return clinicCenter ? 11 : 5;
    }
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff < 0.1) return 13;
    if (maxDiff < 0.5) return 11;
    if (maxDiff < 1) return 10;
    if (maxDiff < 2) return 9;
    if (maxDiff < 5) return 7;
    return 5;
  }, [bounds, clinicCenter, hotspot]);

  // 現在のズームレベル
  const [currentZoom, setCurrentZoom] = useState(initialZoom);

  return (
    <MapContainer
      center={center}
      zoom={initialZoom}
      className="h-64 rounded-lg z-0"
      scrollWheelZoom={false}
      style={{ background: "#f9fafb" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomTracker onZoomChange={setCurrentZoom} />
      <MapController selectedLocation={selectedLocation || null} />
      <MapMarkers markers={markers} maxCount={maxCount} zoom={currentZoom} />
    </MapContainer>
  );
}
