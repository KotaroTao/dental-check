"use client";

import { useEffect, useState, useMemo } from "react";
import { MousePointerClick, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

// データを集約する関数（週単位または月単位）
function aggregateData(data: CTAChartData[], mode: "day" | "week" | "month"): CTAChartData[] {
  if (mode === "day") return data;

  const aggregated: Record<string, CTAChartData> = {};

  for (const item of data) {
    const d = new Date(item.date);
    let key: string;

    if (mode === "week") {
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      key = weekStart.toISOString().split("T")[0];
    } else {
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

  // 日別平均を計算
  const dailyAverage = useMemo(() => {
    if (rawData.length === 0) return 0;
    return Math.round((totals.total / rawData.length) * 10) / 10;
  }, [rawData, totals]);

  // トレンド計算（前半と後半の比較）
  const trend = useMemo(() => {
    if (rawData.length < 2) return { direction: "flat" as const, percent: 0 };
    const mid = Math.floor(rawData.length / 2);
    const firstHalf = rawData.slice(0, mid).reduce((sum, d) => sum + d.count, 0);
    const secondHalf = rawData.slice(mid).reduce((sum, d) => sum + d.count, 0);
    if (firstHalf === 0) {
      return secondHalf > 0
        ? { direction: "up" as const, percent: 100 }
        : { direction: "flat" as const, percent: 0 };
    }
    const change = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
    return {
      direction: change > 5 ? ("up" as const) : change < -5 ? ("down" as const) : ("flat" as const),
      percent: Math.abs(change),
    };
  }, [rawData]);

  // 最大値を計算
  const maxCount = useMemo(() => {
    if (data.length === 0) return 1;
    const max = Math.max(...data.map((d) => d.count));
    return max || 1;
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <MousePointerClick className="w-5 h-5" />
          <span className="font-medium">CTAクリック推移</span>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      </div>
    );
  }

  const aggregationLabel =
    aggregationMode === "week" ? "週単位" : aggregationMode === "month" ? "月単位" : "";

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">CTAクリック推移</h3>
            {aggregationLabel && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                {aggregationLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-teal-500"></div>
              <span className="text-gray-600">診断結果</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
              <span className="text-gray-600">医院ページ</span>
            </div>
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">合計クリック</div>
          <div className="text-2xl font-bold text-gray-800">{totals.total}</div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4">
          <div className="text-sm text-teal-700 mb-1">診断結果から</div>
          <div className="text-2xl font-bold text-teal-600">{totals.fromResult}</div>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-4">
          <div className="text-sm text-violet-700 mb-1">医院ページから</div>
          <div className="text-2xl font-bold text-violet-600">{totals.fromClinicPage}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
          <div className="text-sm text-amber-700 mb-1 flex items-center gap-1">
            トレンド
            {trend.direction === "up" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
            {trend.direction === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
            {trend.direction === "flat" && <Minus className="w-4 h-4 text-gray-400" />}
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {dailyAverage}
            <span className="text-sm font-normal text-amber-600">/日</span>
          </div>
        </div>
      </div>

      {/* グラフ */}
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 p-6">
          データがありません
        </div>
      ) : (
        <div className="p-6">
          {/* エリアチャート風の表示 */}
          <div className="relative h-40">
            {/* グリッド線 */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-gray-100 w-full" />
              ))}
            </div>

            {/* 棒グラフ */}
            <div className="absolute inset-0 flex items-end gap-px">
              {data.map((item, index) => {
                const heightPercent = (item.count / maxCount) * 100;
                const resultPercent =
                  item.count > 0 ? (item.fromResult / item.count) * heightPercent : 0;
                const clinicPercent = heightPercent - resultPercent;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col justify-end group relative"
                    style={{ minWidth: "4px" }}
                  >
                    {/* スタック棒グラフ */}
                    <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
                      {/* 医院ページ（上） */}
                      {item.fromClinicPage > 0 && (
                        <div
                          className="w-full bg-violet-400 group-hover:bg-violet-500 transition-colors rounded-t-sm"
                          style={{ height: `${clinicPercent}%`, minHeight: "2px" }}
                        />
                      )}
                      {/* 診断結果（下） */}
                      {item.fromResult > 0 && (
                        <div
                          className={`w-full bg-teal-400 group-hover:bg-teal-500 transition-colors ${
                            item.fromClinicPage === 0 ? "rounded-t-sm" : ""
                          }`}
                          style={{ height: `${resultPercent}%`, minHeight: "2px" }}
                        />
                      )}
                      {/* データなし */}
                      {item.count === 0 && (
                        <div className="w-full h-0.5 bg-gray-200 rounded-full" />
                      )}
                    </div>

                    {/* ホバー時のツールチップ */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                        <div className="font-medium mb-1.5 text-gray-300">
                          {formatTooltipDate(item.date, aggregationMode)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                              診断結果
                            </span>
                            <span className="font-semibold">{item.fromResult}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                              医院ページ
                            </span>
                            <span className="font-semibold">{item.fromClinicPage}</span>
                          </div>
                          <div className="border-t border-gray-700 pt-1 mt-1">
                            <div className="flex items-center justify-between gap-3">
                              <span>合計</span>
                              <span className="font-bold text-white">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 日付ラベル */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{formatDateLabel(data[0]?.date || "", aggregationMode)}</span>
            {data.length > 2 && (
              <span>{formatDateLabel(data[Math.floor(data.length / 2)]?.date || "", aggregationMode)}</span>
            )}
            <span>{formatDateLabel(data[data.length - 1]?.date || "", aggregationMode)}</span>
          </div>
        </div>
      )}
    </div>
  );
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
function formatDateLabel(date: string, mode: "day" | "week" | "month"): string {
  if (!date) return "";
  const d = new Date(date);

  if (mode === "month") {
    return `${d.getFullYear()}/${d.getMonth() + 1}`;
  } else if (mode === "week") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } else {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}
