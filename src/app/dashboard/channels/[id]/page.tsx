"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, ExternalLink, BarChart3 } from "lucide-react";

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface DiagnosisTypeInfo {
  slug: string;
  name: string;
  description: string;
}

interface DiagnosisStats {
  accessCount: number;
  diagnosisCount: number;
  ctaClickCount: number;
}

const diagnosisTypes: DiagnosisTypeInfo[] = [
  {
    slug: "oral-age",
    name: "お口年齢診断",
    description: "簡単な質問に答えて、お口年齢をチェック",
  },
  {
    slug: "child-orthodontics",
    name: "子供の矯正タイミングチェック",
    description: "お子さんの歯並び・矯正タイミングをチェック",
  },
];

export default function ChannelDetailPage() {
  const params = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, DiagnosisStats>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await fetch(`/api/channels/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setChannel(data.channel);
        }
      } catch (error) {
        console.error("Failed to fetch channel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchChannel();
    }
  }, [params.id]);

  // 診断タイプ別統計を取得
  useEffect(() => {
    const fetchStats = async () => {
      if (!params.id) return;
      try {
        const response = await fetch(`/api/channels/${params.id}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data.byDiagnosisType || {});
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, [params.id]);

  // QRコード生成
  const generateQRCode = useCallback(
    (slug: string) => {
      const canvas = canvasRefs.current[slug];
      if (channel && canvas) {
        const url = `${baseUrl}/c/${channel.code}/${slug}`;
        QRCode.toCanvas(canvas, url, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
      }
    },
    [channel, baseUrl]
  );

  useEffect(() => {
    if (channel) {
      diagnosisTypes.forEach((type) => {
        generateQRCode(type.slug);
      });
    }
  }, [channel, generateQRCode]);

  const handleDownload = (slug: string, name: string) => {
    const canvas = canvasRefs.current[slug];
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `qr-${channel?.name || "channel"}-${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopy = async (slug: string) => {
    if (!channel) return;
    const url = `${baseUrl}/c/${channel.code}/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedType(slug);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const setCanvasRef = (slug: string) => (el: HTMLCanvasElement | null) => {
    canvasRefs.current[slug] = el;
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!channel) {
    return <div className="text-gray-500">経路が見つかりません</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard/channels"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        経路一覧に戻る
      </Link>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{channel.name}</h1>
            {channel.description && (
              <p className="text-gray-500 mt-1">{channel.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              channel.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {channel.isActive ? "有効" : "無効"}
          </span>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm text-gray-500 mb-1">経路コード</div>
          <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono">
            {channel.code}
          </code>
        </div>
      </div>

      {/* 診断タイプ別QRコード */}
      <h2 className="text-lg font-bold mb-4">診断タイプ別QRコード</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {diagnosisTypes.map((type) => {
          const typeStats = stats[type.slug] || {
            accessCount: 0,
            diagnosisCount: 0,
            ctaClickCount: 0,
          };
          const diagnosisUrl = `${baseUrl}/c/${channel.code}/${type.slug}`;

          return (
            <div
              key={type.slug}
              className="bg-white rounded-xl shadow-sm border p-6"
            >
              <div className="mb-4">
                <h3 className="font-bold text-lg">{type.name}</h3>
                <p className="text-gray-500 text-sm">{type.description}</p>
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {typeStats.accessCount}
                  </div>
                  <div className="text-xs text-gray-500">アクセス</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {typeStats.diagnosisCount}
                  </div>
                  <div className="text-xs text-gray-500">診断完了</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {typeStats.ctaClickCount}
                  </div>
                  <div className="text-xs text-gray-500">CTA</div>
                </div>
              </div>

              {/* QRコード */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-3 rounded-lg border mb-4">
                  <canvas ref={setCanvasRef(type.slug)} />
                </div>

                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(type.slug, type.name)}
                    className="gap-1"
                  >
                    <Download className="w-3 h-3" />
                    ダウンロード
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(type.slug)}
                    className="gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedType === type.slug ? "コピー済み" : "URLコピー"}
                  </Button>
                </div>

                <div className="w-full bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-gray-600 break-all">
                      {diagnosisUrl}
                    </code>
                    <a
                      href={diagnosisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 使い方ガイド */}
      <div className="bg-blue-50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">使い方</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 各診断タイプのQRコードをダウンロードして、チラシや看板に印刷</li>
              <li>• URLをSNSやホームページに掲載して集患</li>
              <li>• アクセス数・診断完了数・CTAクリック数で効果を計測</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
