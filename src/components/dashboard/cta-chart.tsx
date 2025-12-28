"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";

interface CTAChartData {
  date: string;
  count: number;
  fromResult: number;
  fromClinicPage: number;
}

interface CTAChartProps {
  period: string;
  channelId?: string;
  customStartDate?: string;
  customEndDate?: string;
}

// CTAタイプの表示名
const SOURCE_NAMES: Record<string, string> = {
  fromResult: "診断結果",
  fromClinicPage: "医院ページ",
};

// データを集約する関数（週単位または月単位）
function aggregateData(data: CTAChartData[], mode: "day" | "week" | "month"): CTAChartData[] {
  if (mode === "day") return data;

  const aggregated: Record<string, CTAChartData> = {};

  for (const item of data) {
    const d = new Date(item.date);
    let key: string;

    if (mode === "week") {
      // 週の開始日（月曜日）を取得
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      key = weekStart.toISOString().split("T")[0];
    } else {
      // 月の最初の日
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }

    if (!aggregated[key]) {
      aggregated[key] = { date: key, count: 0, fromResult: 0, fromClinicPage: 0 };
    }
    aggregated[key].count += item.count;
    aggregated[key].fromResult += item.fromResult;
    aggregated[key].fromClinicPage += item.fromClinicPage;
  }

  return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
}

export function CTAChart({ period, channelId, customStartDate, customEndDate }: CTAChartProps) {
  const [rawData, setRawData] = useState<CTAChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (channelId) params.set("channelId", channelId);
        if (period === "custom" && customStartDate && customEndDate) {
          params.set("startDate", customStartDate);
          params.set("endDate", customEndDate);
        }

        const response = await fetch(`/api/dashboard/cta-chart?${params}`);
        if (response.ok) {
          const result = await response.json();
          setRawData(result.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch CTA chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, channelId, customStartDate, customEndDate]);

  // データを適切な粒度に集約
  const { data, aggregationMode } = useMemo(() => {
    const count = rawData.length;
    if (count <= 31) {
      return { data: rawData, aggregationMode: "day" as const };
    } else if (count <= 90) {
      return { data: aggregateData(rawData, "week"), aggregationMode: "week" as const };
    } else {
      return { data: aggregateData(rawData, "month"), aggregationMode: "month" as const };
    }
  }, [rawData]);

  // 最大値を計算（少数データでも見やすくなるように最適化）
  const maxCount = useMemo(() => {
    if (data.length === 0) return 5;
    // 個別の最大値（横並び表示のため）
    const maxFromResult = Math.max(...data.map(d => d.fromResult));
    const maxFromClinicPage = Math.max(...data.map(d => d.fromClinicPage));
    const max = Math.max(maxFromResult, maxFromClinicPage);

    // 少数データ対応: 最大値に応じてスケールを調整
    if (max === 0) return 5;
    if (max <= 3) return 5;
    if (max <= 5) return 6;
    if (max <= 10) return 12;
    return Math.ceil(max * 1.2);
  }, [data]);

  // バーの高さを計算（最小高さを保証）
  const calcBarHeight = (value: number): number => {
    if (value === 0) return 0;
    const percentage = (value / maxCount) * 100;
    // 最小8%の高さを保証
    return Math.max(percentage, 8);
  };

  // 合計を計算
  const totals = useMemo(() => {
    return rawData.reduce(
      (acc, d) => ({
        total: acc.total + d.count,
        fromResult: acc.fromResult + d.fromResult,
        fromClinicPage: acc.fromClinicPage + d.fromClinicPage,
      }),
      { total: 0, fromResult: 0, fromClinicPage: 0 }
    );
  }, [rawData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">CTAクリック推移</span>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">CTAクリック推移</span>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </div>
    );
  }

  // 集約モードに応じたラベル
  const aggregationLabel = aggregationMode === "week" ? "（週単位）" : aggregationMode === "month" ? "（月単位）" : "";

  // Y軸の目盛りを計算
  const yAxisTicks = calculateYAxisTicks(maxCount);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-gray-700">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">CTAクリック推移</span>
          {aggregationLabel && (
            <span className="text-xs text-gray-400">{aggregationLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-gray-600">{SOURCE_NAMES.fromResult}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-indigo-500"></div>
            <span className="text-gray-600">{SOURCE_NAMES.fromClinicPage}</span>
          </div>
        </div>
      </div>

      {/* グラフ本体 */}
      <div className="relative h-56">
        {/* Y軸の目盛りとグリッド線 */}
        <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-400">
          {yAxisTicks.map((tick, i) => (
            <span key={i}>{tick}</span>
          ))}
        </div>

        {/* グリッド線 */}
        <div className="absolute left-10 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
          {yAxisTicks.map((_, i) => (
            <div key={i} className="border-t border-gray-100 w-full" />
          ))}
        </div>

        {/* グラフエリア（横スクロール対応） */}
        <div className="ml-10 h-full overflow-x-auto">
          <div
            className="h-full flex items-end gap-1 pb-8"
            style={{ minWidth: data.length > 14 ? `${data.length * 40}px` : "100%" }}
          >
            {data.map((item, index) => {
              const hasData = item.count > 0;
              const resultHeight = calcBarHeight(item.fromResult);
              const clinicHeight = calcBarHeight(item.fromClinicPage);

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center group relative"
                  style={{ minWidth: data.length > 14 ? "44px" : undefined }}
                >
                  {/* 横並び棒グラフ */}
                  <div
                    className="w-full max-w-[40px] mx-auto flex gap-0.5 items-end relative"
                    style={{ height: `calc(100% - 2rem)` }}
                  >
                    {/* 診断結果からのクリック（緑） */}
                    <div className="flex-1 flex flex-col items-center justify-end h-full">
                      {item.fromResult > 0 && (
                        <span className="text-[10px] font-medium text-emerald-600 mb-0.5">
                          {item.fromResult}
                        </span>
                      )}
                      <div
                        className="w-full bg-emerald-500 rounded-t transition-all duration-300 group-hover:bg-emerald-600"
                        style={{
                          height: `${resultHeight}%`,
                          minHeight: item.fromResult > 0 ? "12px" : "0",
                        }}
                      />
                    </div>

                    {/* 医院ページからのクリック（青） */}
                    <div className="flex-1 flex flex-col items-center justify-end h-full">
                      {item.fromClinicPage > 0 && (
                        <span className="text-[10px] font-medium text-indigo-600 mb-0.5">
                          {item.fromClinicPage}
                        </span>
                      )}
                      <div
                        className="w-full bg-indigo-500 rounded-t transition-all duration-300 group-hover:bg-indigo-600"
                        style={{
                          height: `${clinicHeight}%`,
                          minHeight: item.fromClinicPage > 0 ? "12px" : "0",
                        }}
                      />
                    </div>

                    {/* データなしの場合の表示 */}
                    {!hasData && (
                      <div className="w-full h-1 bg-gray-200 rounded absolute bottom-0" />
                    )}

                    {/* ホバー時のツールチップ */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg">
                        <div className="font-medium mb-1">{formatTooltipDate(item.date, aggregationMode)}</div>
                        <div className="flex justify-between gap-4">
                          <span className="text-emerald-300">診断結果:</span>
                          <span>{item.fromResult}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-indigo-300">医院ページ:</span>
                          <span>{item.fromClinicPage}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-gray-600 pt-1 mt-1">
                          <span>合計:</span>
                          <span className="font-bold">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 日付ラベル */}
                  <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                    {formatDateLabel(item.date, data.length, aggregationMode)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 合計サマリー */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-800">{totals.total}</div>
          <div className="text-xs text-gray-500">合計クリック</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-600">{totals.fromResult}</div>
          <div className="text-xs text-gray-500">診断結果から</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-indigo-600">{totals.fromClinicPage}</div>
          <div className="text-xs text-gray-500">医院ページから</div>
        </div>
      </div>
    </div>
  );
}

// Y軸の目盛りを計算
function calculateYAxisTicks(max: number): number[] {
  if (max <= 5) {
    return [max, Math.ceil(max / 2), 0];
  } else if (max <= 10) {
    return [max, Math.round(max / 2), 0];
  } else {
    const step = Math.ceil(max / 4);
    return [max, step * 2, step, 0];
  }
}

// ツールチップ用の日付フォーマット
function formatTooltipDate(date: string, mode: "day" | "week" | "month"): string {
  const d = new Date(date);
  if (mode === "month") {
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  } else if (mode === "week") {
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 6);
    return `${d.getMonth() + 1}/${d.getDate()}〜${endDate.getMonth() + 1}/${endDate.getDate()}`;
  } else {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  }
}

// 日付ラベルのフォーマット
function formatDateLabel(date: string, totalCount: number, mode: "day" | "week" | "month"): string {
  const d = new Date(date);

  if (mode === "month") {
    return `${d.getMonth() + 1}月`;
  } else if (mode === "week") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } else if (totalCount <= 7) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  } else if (totalCount <= 14) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } else {
    return `${d.getDate()}`;
  }
}
