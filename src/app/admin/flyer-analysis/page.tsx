"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ArrowUpDown,
  Image as ImageIcon,
  TrendingUp,
  Megaphone,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChannelAnalysis {
  id: string;
  clinicName: string;
  clinicSlug: string;
  name: string;
  channelType: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  distributionMethod: string | null;
  distributionQuantity: number | null;
  budget: number | null;
  scans: number;
  completions: number;
  ctaClicks: number;
  responseRate: number | null;
  completionRate: number | null;
  ctaRate: number | null;
  costPerScan: number | null;
  costPerCta: number | null;
  createdAt: string;
}

interface MethodStat {
  method: string;
  count: number;
  totalScans: number;
  totalCompletions: number;
  totalCtaClicks: number;
  avgResponseRate: number | null;
  avgCompletionRate: number | null;
  avgCtaRate: number | null;
  avgCostPerScan: number | null;
}

interface AnalysisData {
  channels: ChannelAnalysis[];
  methodStats: MethodStat[];
  period: number;
}

type SortKey = "responseRate" | "completionRate" | "ctaRate" | "costPerScan" | "costPerCta" | "scans" | "completions" | "ctaClicks";

export default function FlyerAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(90);
  const [methodFilter, setMethodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scans");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ days: String(period) });
      if (methodFilter) params.set("method", methodFilter);
      const response = await fetch(`/api/admin/flyer-analysis?${params}`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        setError("データの取得に失敗しました");
      }
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [period, methodFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedChannels = data?.channels
    ? [...data.channels].sort((a, b) => {
        const aVal = a[sortKey] ?? -Infinity;
        const bVal = b[sortKey] ?? -Infinity;
        return sortAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
    );
  }

  if (!data) return null;

  const methodChartData = data.methodStats
    .filter((m) => m.method !== "未設定")
    .map((m) => ({
      method: m.method,
      反応率: m.avgResponseRate ?? 0,
      完了率: m.avgCompletionRate ?? 0,
      CTA率: m.avgCtaRate ?? 0,
    }));

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">チラシ効果分析</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">全配布方法</option>
            <option value="ポスティング">ポスティング</option>
            <option value="手配り">手配り</option>
            <option value="店頭設置">店頭設置</option>
            <option value="新聞折込">新聞折込</option>
            <option value="DM">DM</option>
            <option value="その他">その他</option>
          </select>
          <div className="flex gap-1">
            {[30, 90, 180, 365].map((days) => (
              <Button
                key={days}
                variant={period === days ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {days}日
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 配布方法別サマリーカード */}
      {data.methodStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.methodStats.map((ms) => (
            <Card key={ms.method}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{ms.method}</span>
                  </div>
                  <span className="text-xs text-gray-500">{ms.count}件</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500">反応率</div>
                    <div className="text-lg font-bold text-blue-600">
                      {ms.avgResponseRate !== null ? `${ms.avgResponseRate}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">完了率</div>
                    <div className="text-lg font-bold text-green-600">
                      {ms.avgCompletionRate !== null ? `${ms.avgCompletionRate}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">CTA率</div>
                    <div className="text-lg font-bold text-purple-600">
                      {ms.avgCtaRate !== null ? `${ms.avgCtaRate}%` : "-"}
                    </div>
                  </div>
                </div>
                {ms.avgCostPerScan !== null && (
                  <div className="mt-2 text-center text-xs text-gray-500">
                    1QR読込あたり ¥{ms.avgCostPerScan.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 配布方法別比較チャート */}
      {methodChartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              配布方法別の効果比較
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="反応率" fill="#3B82F6" />
                  <Bar dataKey="完了率" fill="#10B981" />
                  <Bar dataKey="CTA率" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* チャネル一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            チャネル別詳細（{sortedChannels.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">写真</th>
                  <th className="text-left py-3 px-4 font-medium">クリニック</th>
                  <th className="text-left py-3 px-4 font-medium">QRコード名</th>
                  <th className="text-left py-3 px-4 font-medium">配布方法</th>
                  <th className="text-right py-3 px-4 font-medium">配布枚数</th>
                  <th className="text-right py-3 px-4 font-medium">予算</th>
                  <SortHeader label="QR読込数" sortKey="scans" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="反応率" sortKey="responseRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="完了率" sortKey="completionRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="CTA率" sortKey="ctaRate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                  <SortHeader label="1CVコスト" sortKey="costPerCta" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedChannels.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  sortedChannels.map((ch) => (
                    <tr key={ch.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">
                        {ch.imageUrl ? (
                          <img
                            src={ch.imageUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => setPreviewImage(ch.imageUrl)}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-600 whitespace-nowrap">{ch.clinicName}</td>
                      <td className="py-2 px-4 font-medium whitespace-nowrap">{ch.name}</td>
                      <td className="py-2 px-4">
                        {ch.distributionMethod ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                            {ch.distributionMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {ch.distributionQuantity !== null ? ch.distributionQuantity.toLocaleString() : "-"}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {ch.budget !== null ? `¥${ch.budget.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium">{ch.scans.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        <RateCell value={ch.responseRate} suffix="%" />
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        <RateCell value={ch.completionRate} suffix="%" />
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        <RateCell value={ch.ctaRate} suffix="%" />
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {ch.costPerCta !== null ? `¥${ch.costPerCta.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 画像プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt=""
            className="max-w-full max-h-[80vh] rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ソート可能なヘッダー
function SortHeader({
  label,
  sortKey: key,
  currentKey,
  asc,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
}) {
  const isActive = currentKey === key;
  return (
    <th
      className="text-right py-3 px-4 font-medium cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
      onClick={() => onClick(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
        {isActive && (
          <span className="text-xs text-blue-600">{asc ? "↑" : "↓"}</span>
        )}
      </span>
    </th>
  );
}

// 率表示セル
function RateCell({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  return (
    <span className={value > 0 ? "text-gray-900" : "text-gray-400"}>
      {value}{suffix}
    </span>
  );
}
