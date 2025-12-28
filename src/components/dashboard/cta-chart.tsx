"use client";

import { useEffect, useState, useMemo } from "react";
import { MousePointerClick, CheckCircle } from "lucide-react";

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
  const [completedCount, setCompletedCount] = useState(0);
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
          setCompletedCount(result.completedCount || 0);
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

  // データがある日のみをフィルタ（新しい順）
  const dataWithClicks = useMemo(() => {
    return [...data].filter((d) => d.count > 0).reverse();
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
        <div className="flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">CTAクリック推移</h3>
          {aggregationLabel && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
              {aggregationLabel}
            </span>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            診断完了
          </div>
          <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
        </div>
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
      </div>

      {/* テーブル */}
      {dataWithClicks.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-400">
          クリックデータがありません
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="px-6 py-3 font-medium">日付</th>
                <th className="px-6 py-3 font-medium text-center">診断結果</th>
                <th className="px-6 py-3 font-medium text-center">医院ページ</th>
                <th className="px-6 py-3 font-medium text-center">合計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dataWithClicks.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-800">
                    {formatTableDate(item.date, aggregationMode)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {item.fromResult > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        {item.fromResult}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {item.fromClinicPage > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                        {item.fromClinicPage}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-sm font-bold">
                      {item.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// テーブル用の日付フォーマット
function formatTableDate(date: string, mode: "day" | "week" | "month"): string {
  const d = new Date(date);
  const days = ["日", "月", "火", "水", "木", "金", "土"];

  if (mode === "month") {
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  } else if (mode === "week") {
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 6);
    return `${d.getMonth() + 1}/${d.getDate()} 〜 ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  } else {
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  }
}
