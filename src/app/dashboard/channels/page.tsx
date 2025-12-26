"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QrCode, Plus, Settings, Trash2 } from "lucide-react";

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch("/api/channels");
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この経路を削除しますか？関連するアクセスログも削除されます。")) {
      return;
    }

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChannels(channels.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">経路・QRコード</h1>
        <Link href="/dashboard/channels/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新しい経路を作成
          </Button>
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            まだ経路がありません
          </h2>
          <p className="text-gray-500 mb-6">
            経路を作成してQRコードを発行しましょう
          </p>
          <Link href="/dashboard/channels/new">
            <Button>最初の経路を作成する</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  経路名
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  コード
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">
                  ステータス
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {channels.map((channel) => (
                <tr key={channel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{channel.name}</div>
                    {channel.description && (
                      <div className="text-sm text-gray-500">
                        {channel.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {channel.code}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {channel.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        有効
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        無効
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/channels/${channel.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <QrCode className="w-4 h-4" />
                          QRコード
                        </Button>
                      </Link>
                      <Link href={`/dashboard/channels/${channel.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(channel.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
