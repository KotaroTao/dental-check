"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Stats {
  totalAccess: number;
  totalDiagnosis: number;
  totalCtaClick: number;
  channels: {
    id: string;
    name: string;
    accessCount: number;
    diagnosisCount: number;
    ctaClickCount: number;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のAPIから統計データを取得
    // 現在はダミーデータを表示
    setStats({
      totalAccess: 0,
      totalDiagnosis: 0,
      totalCtaClick: 0,
      channels: [],
    });
    setIsLoading(false);
  }, []);

  if (isLoading) {
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
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="text-sm text-gray-500 mb-1">総アクセス数</div>
          <div className="text-3xl font-bold text-primary">
            {stats?.totalAccess.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="text-sm text-gray-500 mb-1">診断完了数</div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.totalDiagnosis.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="text-sm text-gray-500 mb-1">CTAクリック数</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats?.totalCtaClick.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 経路別統計 */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold">経路別の効果</h2>
        </div>
        {stats?.channels.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ経路が登録されていません
            </h3>
            <p className="text-gray-500 mb-6">
              QRコードを発行して、チラシや看板からのアクセスを計測しましょう
            </p>
            <Link href="/dashboard/channels/new">
              <Button>最初の経路を作成する</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    経路名
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    アクセス
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    診断完了
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    CTAクリック
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats?.channels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{channel.name}</td>
                    <td className="px-6 py-4 text-right">
                      {channel.accessCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {channel.diagnosisCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {channel.ctaClickCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/channels/${channel.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* クイックスタートガイド */}
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
    </div>
  );
}
