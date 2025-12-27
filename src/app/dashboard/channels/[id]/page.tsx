"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, ExternalLink } from "lucide-react";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
};

interface Channel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  diagnosisTypeSlug: string;
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
    ? `${baseUrl}/c/${channel.code}/${channel.diagnosisTypeSlug}`
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
    if (!canvasRef.current || !channel) return;

    const link = document.createElement("a");
    link.download = `qr-${channel.name}.png`;
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

  const diagnosisTypeName =
    DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        ダッシュボードに戻る
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

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">経路コード</div>
            <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono">
              {channel.code}
            </code>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">診断タイプ</div>
            <span className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
              {diagnosisTypeName}
            </span>
          </div>
        </div>
      </div>

      {/* QRコードセクション */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">QRコード</h2>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border mb-4">
            <canvas ref={canvasRef} />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            このQRコードをスキャンすると「{diagnosisTypeName}」が開始されます
          </p>

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
    </div>
  );
}
