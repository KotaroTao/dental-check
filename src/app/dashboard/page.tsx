"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, MousePointerClick, Percent, ChevronDown } from "lucide-react";

// 期間の選択肢
const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
];

interface Stats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
}

interface Channel {
  id: string;
  name: string;
  diagnosisTypeSlug: string;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  diagnosisType: string;
  diagnosisTypeSlug: string;
  channelName: string;
  channelId: string;
  resultCategory: string;
  ctaType: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // フィルター
  const [period, setPeriod] = useState("month");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedDiagnosisType, setSelectedDiagnosisType] = useState("");

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 統計データ取得
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (selectedChannelId) params.set("channelId", selectedChannelId);

      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setChannels(data.channels);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [period, selectedChannelId]);

  // 履歴データ取得
  const fetchHistory = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      const params = new URLSearchParams({
        period,
        offset: offset.toString(),
        limit: "50",
      });
      if (selectedChannelId) params.set("channelId", selectedChannelId);
      if (selectedDiagnosisType) params.set("diagnosisType", selectedDiagnosisType);

      const response = await fetch(`/api/dashboard/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setHistory((prev) => [...prev, ...data.history]);
        } else {
          setHistory(data.history);
        }
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [period, selectedChannelId, selectedDiagnosisType]);

  // 初回読み込み・フィルター変更時
  useEffect(() => {
    fetchStats();
    fetchHistory(0, false);
  }, [fetchStats, fetchHistory]);

  // もっと見る
  const handleLoadMore = () => {
    fetchHistory(history.length, true);
  };

  if (isLoading && !stats) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <Link href="/dashboard/channels/new">
          <Button>+ 新しい経路を作成</Button>
        </Link>
      </div>

      {/* 統計サマリー */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            統計サマリー
          </h2>
          <div className="flex gap-2 ml-auto">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm bg-white"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm bg-white"
            >
              <option value="">全ての経路</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              アクセス
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.accessCount.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" />
              診断完了
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats?.completedCount.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Percent className="w-4 h-4" />
              完了率
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.completionRate || 0}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MousePointerClick className="w-4 h-4" />
              CTAクリック
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.ctaCount.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 診断完了履歴 */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-bold">診断完了履歴</h2>
            <div className="flex gap-2 ml-auto">
              <select
                value={selectedDiagnosisType}
                onChange={(e) => setSelectedDiagnosisType(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white"
              >
                <option value="">全ての診断</option>
                <option value="oral-age">お口年齢診断</option>
                <option value="child-orthodontics">矯正チェック</option>
              </select>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ診断完了履歴がありません
            </h3>
            <p className="text-gray-500">
              QRコードから診断が完了されると、ここに履歴が表示されます
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      日時
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      診断
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      経路
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      結果
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                      CTA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {item.diagnosisType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.channelName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {item.resultCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.ctaType ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                            {item.ctaType}
                          </span>
                        ) : (
                          <span className="text-gray-400">−</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                該当: {totalCount.toLocaleString()}件
              </div>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore ? "読み込み中..." : "もっと見る"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* クイックスタートガイド（経路がない場合のみ表示） */}
      {channels.length === 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h2 className="text-lg font-bold text-blue-900 mb-4">
            はじめての方へ
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                1
              </div>
              <h3 className="font-medium mb-1">経路を作成</h3>
              <p className="text-sm text-gray-600">
                「チラシ①」「医院前看板」など、計測したい経路を登録
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                2
              </div>
              <h3 className="font-medium mb-1">QRコードを印刷</h3>
              <p className="text-sm text-gray-600">
                発行されたQRコードをチラシや看板に印刷
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-2">
                3
              </div>
              <h3 className="font-medium mb-1">効果を確認</h3>
              <p className="text-sm text-gray-600">
                ダッシュボードで経路別の効果を比較
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
