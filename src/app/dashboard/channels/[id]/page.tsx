"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Copy, ExternalLink, Edit, Image as ImageIcon, X, Calendar, AlertTriangle, Link2, Code, Check, Eye } from "lucide-react";

// 診断タイプの表示名
const DIAGNOSIS_TYPE_NAMES: Record<string, string> = {
  "oral-age": "お口年齢診断",
  "child-orthodontics": "子供の矯正タイミングチェック",
  "periodontal-risk": "歯周病リスク診断",
  "cavity-risk": "虫歯リスク診断",
  "whitening-check": "ホワイトニング適正診断",
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
  budget: number | null;
}

interface ChannelStats {
  accessCount: number;
  completedCount: number;
  completionRate: number;
  ctaCount: number;
  ctaRate: number;
  ctaByType?: Record<string, number>;
}

// CTAタイプの表示名
const CTA_TYPE_NAMES: Record<string, string> = {
  booking: "予約",
  phone: "電話",
  line: "LINE",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  threads: "Threads",
  x: "X",
  google_maps: "マップ",
  clinic_page: "医院ページ",
  clinic_homepage: "ホームページ",
  direct_link: "直リンク",
};

interface SubscriptionInfo {
  isDemo?: boolean;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
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

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/dashboard/channel-stats?period=all`);
        if (response.ok) {
          const data = await response.json();
          if (data.stats && params.id && data.stats[params.id as string]) {
            setStats(data.stats[params.id as string]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/billing/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      }
    };

    if (params.id) {
      fetchChannel();
      fetchStats();
      fetchSubscription();
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

  // ハッシュアンカーへのスクロール対応
  useEffect(() => {
    if (stats && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        // 少し遅延させてDOMが確実にレンダリングされた後にスクロール
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  }, [stats]);

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

  const handleCopyEmbed = async (type: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedEmbed(type);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  // 埋め込み用HTMLコード
  const embedButton = channel
    ? `<a href="${qrUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
  ${channel.channelType === "diagnosis" ? "診断を始める" : "詳しくはこちら"}
</a>`
    : "";

  const embedButtonSimple = channel
    ? `<a href="${qrUrl}" target="_blank" rel="noopener noreferrer">${channel.channelType === "diagnosis" ? "診断を始める" : "詳しくはこちら"}</a>`
    : "";

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
            {subscription?.isDemo ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowDemoModal(true)}
              >
                <Edit className="w-4 h-4" />
                編集
              </Button>
            ) : (
              <Link href={`/dashboard/channels/${channel.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="w-4 h-4" />
                  編集
                </Button>
              </Link>
            )}
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

        {/* 診断タイプの場合: 統計情報を表示 */}
        {channel.channelType === "diagnosis" && stats && (
          <div className="border-t pt-4 mt-4 space-y-4">
            {/* 統計情報（ダッシュボードと同じ形式） */}
            <div className="grid grid-cols-3 gap-3">
              {/* QR読み込み回数 */}
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">QR読み込み</div>
                <div className="text-xl font-bold text-emerald-600">{stats.accessCount?.toLocaleString() || 0}</div>
              </div>

              {/* CTAクリック数 */}
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">CTAクリック</div>
                <div className="text-xl font-bold text-purple-600">{stats.ctaCount?.toLocaleString() || 0}</div>
              </div>

              {/* CTA率 */}
              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">CTA率</div>
                <div className="text-xl font-bold text-orange-600">{stats.ctaRate || 0}%</div>
              </div>
            </div>

            {/* CTA内訳 */}
            {stats.ctaByType && Object.keys(stats.ctaByType).length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">CTA内訳</div>
                <div className="space-y-2">
                  {Object.entries(stats.ctaByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{CTA_TYPE_NAMES[type] || type}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${stats.ctaCount > 0 ? (count / stats.ctaCount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-purple-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* リンクタイプの場合: リダイレクト先とスキャン数を表示 */}
        {channel.channelType === "link" && (
          <div className="border-t pt-4 mt-4 space-y-4">
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

            {/* 統計情報（ダッシュボードと同じ形式） */}
            <div className="grid grid-cols-3 gap-3">
              {/* QR読み込み回数 */}
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">QR読み込み</div>
                <div className="text-xl font-bold text-emerald-600">{channel.scanCount.toLocaleString()}</div>
              </div>

              {/* CTAクリック数 */}
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">CTAクリック</div>
                <div className="text-xl font-bold text-purple-600">{stats?.ctaCount?.toLocaleString() || 0}</div>
              </div>

              {/* CTA率 */}
              <div className="text-center p-3 bg-orange-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">CTA率</div>
                <div className="text-xl font-bold text-orange-600">{stats?.ctaRate || 0}%</div>
              </div>
            </div>

            {/* CTA内訳 */}
            {stats?.ctaByType && Object.keys(stats.ctaByType).length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">CTA内訳</div>
                <div className="space-y-2">
                  {Object.entries(stats.ctaByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{CTA_TYPE_NAMES[type] || type}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${stats.ctaCount > 0 ? (count / stats.ctaCount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-purple-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
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

      {/* ホームページ埋め込みセクション */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold">ホームページに埋め込む</h2>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          以下のHTMLコードをコピーして、ホームページやブログに貼り付けてください。
        </p>

        <div className="space-y-6">
          {/* ボタンリンク（スタイル付き） */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">リンクボタン（スタイル付き）</h3>
                <p className="text-xs text-gray-500">装飾されたボタンとして表示されます</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyEmbed("button", embedButton)}
                className="gap-1"
              >
                {copiedEmbed === "button" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{embedButton}</code>
            </pre>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">プレビュー:</p>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                {channel.channelType === "diagnosis" ? "診断を始める" : "詳しくはこちら"}
              </a>
            </div>
          </div>

          {/* シンプルリンク */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">シンプルリンク</h3>
                <p className="text-xs text-gray-500">テキストリンクとして表示されます</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyEmbed("simple", embedButtonSimple)}
                className="gap-1"
              >
                {copiedEmbed === "simple" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{embedButtonSimple}</code>
            </pre>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">プレビュー:</p>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {channel.channelType === "diagnosis" ? "診断を始める" : "詳しくはこちら"}
              </a>
            </div>
          </div>
        </div>

        {/* 使い方の説明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-2">埋め込み方法</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>上のコードから使用したい形式を選び「コピー」ボタンをクリック</li>
            <li>ホームページの編集画面を開く（WordPress、Wix、ペライチなど）</li>
            <li>HTMLを編集できるブロックまたはウィジェットを追加</li>
            <li>コピーしたコードを貼り付けて保存</li>
          </ol>
          <p className="text-xs text-blue-600 mt-3">
            ※ ホームページの作成ツールによって操作方法が異なります。詳しくは各ツールのヘルプをご確認ください。
          </p>
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

      {/* デモアカウント制限モーダル */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  デモアカウントです
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  デモアカウントでは、データの閲覧のみ可能です。
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800">
                QRコードの編集を行うには、正式なアカウントでのご登録が必要です。
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowDemoModal(false)}
            >
              閉じる
            </Button>

            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
