"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface StatsData {
  overview: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    period: number;
  };
  diagnosisTypes: {
    id: string;
    slug: string;
    name: string;
    count: number;
    avgScore: number;
  }[];
  dailyStats: {
    date: string;
    started: number;
    completed: number;
  }[];
  resultDistribution: {
    category: string;
    count: number;
  }[];
  ageDistribution: {
    group: string;
    count: number;
  }[];
  genderDistribution: {
    gender: string;
    count: number;
  }[];
  ctaStats: {
    type: string;
    count: number;
  }[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(30);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/stats?days=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `統計の取得に失敗しました (${response.status})`);
      }
    } catch (e) {
      setError(`統計の取得に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">診断統計ダッシュボード</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
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
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="診断開始数"
          value={stats.overview.totalSessions}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="診断完了数"
          value={stats.overview.completedSessions}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="完了率"
          value={`${stats.overview.completionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="CTAクリック数"
          value={stats.ctaStats.reduce((sum, c) => sum + c.count, 0)}
          icon={<MousePointerClick className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* 日別推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            日別診断数の推移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="started"
                  name="開始"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="完了"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 診断タイプ別・結果分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 診断タイプ別統計 */}
        <Card>
          <CardHeader>
            <CardTitle>診断タイプ別実行数</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.diagnosisTypes.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.diagnosisTypes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="実行数" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                データがありません
              </div>
            )}
            {/* 平均スコア表示 */}
            {stats.diagnosisTypes.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">平均スコア</p>
                {stats.diagnosisTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{type.name}</span>
                    <span className="font-medium">{type.avgScore}点</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 結果カテゴリ分布 */}
        <Card>
          <CardHeader>
            <CardTitle>結果カテゴリ分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.resultDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.resultDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {stats.resultDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 年齢・性別分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 年齢分布 */}
        <Card>
          <CardHeader>
            <CardTitle>年齢分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ageDistribution.some((a) => a.count > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="人数" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* 性別分布 */}
        <Card>
          <CardHeader>
            <CardTitle>性別分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.genderDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.genderDistribution}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {stats.genderDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTAクリック統計 */}
      <Card>
        <CardHeader>
          <CardTitle>CTAクリック内訳</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.ctaStats.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ctaStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="クリック数" fill="#EC4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              CTAクリックデータがありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
