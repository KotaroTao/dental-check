"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, ExternalLink } from "lucide-react";

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const diagnosisUrl = channel
    ? `${baseUrl}/c/${channel.code}/oral-age`
    : "";

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

  useEffect(() => {
    if (channel && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, diagnosisUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [channel, diagnosisUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = `qr-${channel?.name || "code"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(diagnosisUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!channel) {
    return <div className="text-gray-500">経路が見つかりません</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
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

      {/* QRコードセクション */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">QRコード</h2>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border mb-4">
            <canvas ref={canvasRef} />
          </div>

          <div className="flex gap-3 mb-6">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              ダウンロード
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="w-4 h-4" />
              {copied ? "コピーしました！" : "URLをコピー"}
            </Button>
          </div>

          <div className="w-full bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">診断URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                {diagnosisUrl}
              </code>
              <a href={diagnosisUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 診断タイプ選択 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">診断タイプ別URL</h2>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">お口年齢診断</span>
              <a
                href={`${baseUrl}/c/${channel.code}/oral-age`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                プレビュー
              </a>
            </div>
            <code className="text-xs text-gray-600 break-all">
              {baseUrl}/c/{channel.code}/oral-age
            </code>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">子供の矯正タイミングチェック</span>
              <a
                href={`${baseUrl}/c/${channel.code}/child-orthodontics`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                プレビュー
              </a>
            </div>
            <code className="text-xs text-gray-600 break-all">
              {baseUrl}/c/{channel.code}/child-orthodontics
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
