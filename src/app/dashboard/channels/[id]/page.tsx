"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, ExternalLink, Edit, Image as ImageIcon, X, Calendar, AlertTriangle, Link2, MousePointerClick } from "lucide-react";

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
  imageUrl: string | null;
  channelType: "diagnosis" | "link";
  diagnosisTypeSlug: string | null;
  redirectUrl: string | null;
  isActive: boolean;
  expiresAt: string | null;
  scanCount: number;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 本番環境では環境変数を優先、それ以外はwindow.location.originを使用
  const baseUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : "";
  // 診断タイプ: /c/{code}/{diagnosisTypeSlug}、リンクタイプ: /c/{code}
  const qrUrl = channel
    ? channel.channelType === "diagnosis"
      ? `${baseUrl}/c/${channel.code}/${channel.diagnosisTypeSlug}`
      : `${baseUrl}/c/${channel.code}`
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
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [channel, qrUrl]);

  const handleDownloadPNG = () => {
    if (!canvasRef.current || !channel) return;

    const link = document.createElement("a");
    link.download = `qr-${channel.name}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleDownloadSVG = async () => {
    if (!channel) return;

    try {
      const svgString = await QRCode.toString(qrUrl, {
        type: "svg",
        width: 256,
        margin: 2,
      });

      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qr-${channel.name}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("SVG download error:", error);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  if (!channel) {
    return <div className="text-gray-500">QRコードが見つかりません</div>;
  }

  const diagnosisTypeName = channel.diagnosisTypeSlug
    ? DIAGNOSIS_TYPE_NAMES[channel.diagnosisTypeSlug] || channel.diagnosisTypeSlug
    : null;

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
          <div className="flex items-start gap-4">
            {/* サムネイル画像 */}
            {channel.imageUrl ? (
              <button
                onClick={() => setShowImageModal(true)}
                className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                <img
                  src={channel.imageUrl}
                  alt={channel.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{channel.name}</h1>
              {channel.description && (
                <p className="text-gray-500 mt-1">{channel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                channel.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {channel.isActive ? "有効" : "無効"}
            </span>
            <Link href={`/dashboard/channels/${channel.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Edit className="w-4 h-4" />
                編集
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">QRコード</div>
            <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono">
              {channel.code}
            </code>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">タイプ</div>
            {channel.channelType === "diagnosis" ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {diagnosisTypeName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-purple-50 text-purple-700">
                <Link2 className="w-4 h-4" />
                リンクのみ
              </span>
            )}
          </div>
        </div>

        {/* リンクタイプの場合: リダイレクト先とスキャン数を表示 */}
        {channel.channelType === "link" && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">リダイレクト先URL</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-1.5 rounded text-sm break-all">
                  {channel.redirectUrl}
                </code>
                <a href={channel.redirectUrl || "#"} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">QR読み込み回数:</span>
              <span className="text-lg font-bold text-purple-600">{channel.scanCount}</span>
            </div>
          </div>
        )}

        {/* 有効期限表示 */}
        {channel.expiresAt && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">有効期限:</span>
              {(() => {
                const expiresAt = new Date(channel.expiresAt);
                const isExpired = new Date() > expiresAt;
                const formatted = expiresAt.toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return isExpired ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    {formatted}（期限切れ）
                  </span>
                ) : (
                  <span className="text-sm font-medium text-gray-700">
                    {formatted}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* QRコードセクション */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold mb-4">QRコード</h2>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border mb-4">
            <canvas ref={canvasRef} />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {channel.channelType === "diagnosis"
              ? `このQRコードをスキャンすると「${diagnosisTypeName}」が開始されます`
              : "このQRコードをスキャンするとリダイレクト先URLに遷移します"}
          </p>

          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <Button onClick={handleDownloadPNG} className="gap-2">
              <Download className="w-4 h-4" />
              PNG
            </Button>
            <Button onClick={handleDownloadSVG} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              SVG
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="w-4 h-4" />
              {copied ? "コピーしました！" : "URLをコピー"}
            </Button>
          </div>

          <div className="w-full bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">
              {channel.channelType === "diagnosis" ? "診断URL" : "QRコードURL"}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                {qrUrl}
              </code>
              <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 画像モーダル */}
      {showImageModal && channel.imageUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={channel.imageUrl}
              alt={channel.name}
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
