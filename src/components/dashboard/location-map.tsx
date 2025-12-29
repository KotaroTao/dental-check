"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, Polygon } from "geojson";
import type { PathOptions } from "leaflet";
import {
  getJapanGeoJSON,
  normalizePrefectureName,
} from "@/data/japan-prefectures";

interface LocationData {
  region: string | null;
  city: string | null;
  count: number;
}

interface LocationMapProps {
  locations: LocationData[];
}

// 件数に応じた境界線の色を返す（グラデーション）
function getBorderColor(count: number, maxCount: number): string {
  if (count === 0) return "#d1d5db"; // gray-300（データなし）

  const ratio = count / maxCount;

  if (ratio > 0.8) return "#1e40af"; // blue-800
  if (ratio > 0.6) return "#2563eb"; // blue-600
  if (ratio > 0.4) return "#3b82f6"; // blue-500
  if (ratio > 0.2) return "#60a5fa"; // blue-400
  return "#93c5fd"; // blue-300
}

// 件数に応じた境界線の太さを返す
function getBorderWeight(count: number, maxCount: number): number {
  if (count === 0) return 1;

  const ratio = count / maxCount;

  if (ratio > 0.6) return 4;
  if (ratio > 0.3) return 3;
  return 2;
}

export default function LocationMap({ locations }: LocationMapProps) {
  // 日本の中心付近
  const defaultCenter: [number, number] = [36.5, 138.0];

  // 都道府県別に集計
  const prefectureData = useMemo(() => {
    const data: Record<string, { count: number; cities: Record<string, number> }> = {};

    for (const loc of locations) {
      if (!loc.region) continue;

      const prefName = normalizePrefectureName(loc.region);

      if (!data[prefName]) {
        data[prefName] = { count: 0, cities: {} };
      }
      data[prefName].count += loc.count;

      if (loc.city) {
        if (!data[prefName].cities[loc.city]) {
          data[prefName].cities[loc.city] = 0;
        }
        data[prefName].cities[loc.city] += loc.count;
      }
    }

    return data;
  }, [locations]);

  // 最大件数
  const maxCount = useMemo(() => {
    return Math.max(...Object.values(prefectureData).map((d) => d.count), 1);
  }, [prefectureData]);

  // GeoJSONデータ
  const geoJsonData = useMemo(() => getJapanGeoJSON(), []);

  // 各都道府県のスタイル（境界線のみ、塗りつぶしなし）
  const getStyle = (feature: Feature<Polygon, { name: string }> | undefined): PathOptions => {
    if (!feature) return {};

    const prefName = feature.properties.name;
    const data = prefectureData[prefName];
    const count = data?.count || 0;

    return {
      fillColor: "transparent",
      fillOpacity: 0,
      weight: getBorderWeight(count, maxCount),
      opacity: 1,
      color: getBorderColor(count, maxCount),
    };
  };

  // 各都道府県にイベントを追加
  const onEachFeature = (
    feature: Feature<Polygon, { name: string }>,
    layer: L.Layer
  ) => {
    const prefName = feature.properties.name;
    const data = prefectureData[prefName];
    const count = data?.count || 0;

    // ツールチップを追加
    if (count > 0) {
      const cities = data?.cities || {};
      const topCities = Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      let tooltipContent = `<div class="text-center">
        <div class="font-bold">${prefName}</div>
        <div class="text-blue-600 font-bold">${count}件</div>`;

      if (topCities.length > 0) {
        tooltipContent += '<div class="text-xs text-gray-500 mt-1">';
        topCities.forEach(([city, cityCount]) => {
          tooltipContent += `${city}: ${cityCount}件<br/>`;
        });
        tooltipContent += "</div>";
      }

      tooltipContent += "</div>";

      layer.bindTooltip(tooltipContent, {
        permanent: false,
        direction: "top",
        className: "prefecture-tooltip",
      });
    }

    // ホバー時のスタイル変更
    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          weight: count > 0 ? 5 : 2,
          color: count > 0 ? "#1d4ed8" : "#6b7280", // blue-700 or gray-500
          fillOpacity: 0,
        });
        target.bringToFront();
      },
      mouseout: (e) => {
        const target = e.target;
        target.setStyle(getStyle(feature));
      },
    });
  };

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
      <GeoJSON
        key={JSON.stringify(prefectureData)}
        data={geoJsonData}
        style={getStyle as (feature: Feature | undefined) => PathOptions}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
