"use client";

import Link from "next/link";
import QRCode from "qrcode";
import {
  QrCode, Settings, Trash2, Download,
  RotateCcw, AlertTriangle, Link2, MoreVertical,
} from "lucide-react";
import type { Channel, ChannelStats } from "./types";
import { DropdownMenu } from "./dropdown-menu";

export function QRCodeRow({
  channel,
  stats,
  color,
  onHide,
  onRestore,
  onPermanentDelete,
  onImageClick,
  isDemo,
  onDemoClick,
}: {
  channel: Channel;
  stats?: ChannelStats;
  color: string;
  onHide: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onImageClick: (url: string, name: string) => void;
  isDemo?: boolean;
  onDemoClick?: () => void;
}) {
  const isExpired = channel.expiresAt && new Date() > new Date(channel.expiresAt);

  // QRコードURL生成
  const baseUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : "";
  const qrUrl = channel.channelType === "diagnosis"
    ? `${baseUrl}/c/${channel.code}/${channel.diagnosisTypeSlug}`
    : `${baseUrl}/c/${channel.code}`;

  const handleDownloadQR = async () => {
    try {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, qrUrl, { width: 256, margin: 2 });
      const link = document.createElement("a");
      link.download = `qr-${channel.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("QR download error:", error);
    }
  };

  const menu = (
    <DropdownMenu
      trigger={
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </button>
      }
    >
      {isDemo ? (
        <button
          onClick={onDemoClick}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 w-full text-left"
        >
          <Settings className="w-4 h-4" />
          詳細・編集
        </button>
      ) : (
        <Link
          href={`/dashboard/channels/${channel.id}`}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" />
          詳細・編集
        </Link>
      )}
      <button
        onClick={handleDownloadQR}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
      >
        <Download className="w-4 h-4" />
        QRダウンロード
      </button>
      <div className="border-t my-1" />
      {channel.isActive ? (
        <button
          onClick={isDemo ? onDemoClick : onHide}
          className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left ${isDemo ? "text-gray-400 hover:bg-gray-50" : "text-red-600 hover:bg-red-50"}`}
        >
          <Trash2 className="w-4 h-4" />
          非表示にする
        </button>
      ) : (
        <>
          <button
            onClick={isDemo ? onDemoClick : onRestore}
            className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left ${isDemo ? "text-gray-400 hover:bg-gray-50" : "text-emerald-600 hover:bg-emerald-50"}`}
          >
            <RotateCcw className="w-4 h-4" />
            復元する
          </button>
          <button
            onClick={isDemo ? onDemoClick : onPermanentDelete}
            className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left ${isDemo ? "text-gray-400 hover:bg-gray-50" : "text-red-600 hover:bg-red-50"}`}
          >
            <Trash2 className="w-4 h-4" />
            完全に削除
          </button>
        </>
      )}
    </DropdownMenu>
  );

  // PC用: テーブル行
  const desktopRow = (
    <tr className="hidden md:table-row hover:bg-gray-50/80 transition-colors group">
      {/* 名前 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {channel.imageUrl ? (
            <button
              onClick={() => onImageClick(channel.imageUrl!, channel.name)}
              className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <img src={channel.imageUrl} alt={channel.name} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0">
              {channel.channelType === "link" ? (
                <Link2 className="w-4 h-4 text-blue-500" />
              ) : (
                <QrCode className="w-4 h-4 text-blue-500" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <Link href={`/dashboard/channels/${channel.id}`} className="font-medium text-sm text-gray-900 truncate block hover:text-blue-600 transition-colors">
              {channel.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {channel.channelType === "link" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">リンク</span>
              )}
              {isExpired && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />期限切れ
                </span>
              )}
              {!channel.isActive && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">無効</span>
              )}
            </div>
          </div>
        </div>
      </td>
      {/* QR読み込み */}
      <td className="px-3 py-3 text-center">
        <span className="text-sm font-bold text-emerald-600">{(stats?.accessCount ?? channel.scanCount).toLocaleString()}</span>
      </td>
      {/* 予算 */}
      <td className="px-3 py-3 text-center">
        {isDemo ? (
          <button onClick={onDemoClick} className={`text-sm hover:underline ${channel.budget && channel.budget > 0 ? "font-medium text-gray-700" : "text-xs text-blue-500 hover:text-blue-700"}`}>
            {channel.budget && channel.budget > 0 ? `¥${channel.budget.toLocaleString()}` : "予算を設定"}
          </button>
        ) : (
          <Link href={`/dashboard/channels/${channel.id}#budget`} className={`hover:underline ${channel.budget && channel.budget > 0 ? "text-sm font-medium text-gray-700 hover:text-blue-600" : "text-xs text-blue-500 hover:text-blue-700"}`}>
            {channel.budget && channel.budget > 0 ? `¥${channel.budget.toLocaleString()}` : "予算を設定"}
          </Link>
        )}
      </td>
      {/* 読込単価 */}
      <td className="px-3 py-3 text-center">
        {channel.budget && channel.budget > 0 ? (
          <span className="text-sm font-bold text-blue-600">
            ¥{(stats?.accessCount ?? channel.scanCount) > 0 ? Math.round(channel.budget / (stats?.accessCount ?? channel.scanCount)).toLocaleString() : "-"}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      {/* CTA */}
      <td className="px-3 py-3 text-center">
        <span className="text-sm font-bold text-purple-600">{stats?.ctaCount?.toLocaleString() ?? "-"}</span>
      </td>
      {/* CTA率 */}
      <td className="px-3 py-3 text-center">
        <span className="text-sm font-bold text-orange-600">{stats && stats.accessCount > 0 ? `${stats.ctaRate}%` : "-"}</span>
      </td>
      {/* 作成日 */}
      <td className="px-3 py-3 text-center text-xs text-gray-500 whitespace-nowrap">
        {new Date(channel.createdAt).toLocaleDateString("ja-JP")}
      </td>
      {/* メニュー */}
      <td className="px-2 py-3 text-center">{menu}</td>
    </tr>
  );

  // モバイル用: コンパクトカード
  const mobileCard = (
    <div className="md:hidden px-4 py-3 hover:bg-gray-50/80 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        {channel.imageUrl ? (
          <button
            onClick={() => onImageClick(channel.imageUrl!, channel.name)}
            className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src={channel.imageUrl} alt={channel.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0">
            {channel.channelType === "link" ? (
              <Link2 className="w-4 h-4 text-blue-500" />
            ) : (
              <QrCode className="w-4 h-4 text-blue-500" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/dashboard/channels/${channel.id}`} className="font-medium text-sm text-gray-900 truncate hover:text-blue-600 transition-colors">
              {channel.name}
            </Link>
            {menu}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {channel.channelType === "link" && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">リンク</span>
            )}
            {isExpired && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />期限切れ
              </span>
            )}
            {!channel.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">無効</span>
            )}
          </div>
        </div>
      </div>
      {/* モバイル: インライン指標 */}
      {channel.isActive && (
        <div className="flex items-center gap-4 mt-2 ml-[3.125rem] text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">読込</span>
            <span className="font-bold text-emerald-600">{(stats?.accessCount ?? channel.scanCount).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">予算</span>
            {isDemo ? (
              <button onClick={onDemoClick} className={`hover:underline ${channel.budget && channel.budget > 0 ? "font-medium text-gray-700" : "text-blue-500"}`}>
                {channel.budget && channel.budget > 0 ? `¥${channel.budget.toLocaleString()}` : "設定"}
              </button>
            ) : (
              <Link href={`/dashboard/channels/${channel.id}#budget`} className={`hover:underline ${channel.budget && channel.budget > 0 ? "font-medium text-gray-700 hover:text-blue-600" : "text-blue-500"}`}>
                {channel.budget && channel.budget > 0 ? `¥${channel.budget.toLocaleString()}` : "設定"}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">単価</span>
            {channel.budget && channel.budget > 0 ? (
              <span className="font-bold text-blue-600">¥{(stats?.accessCount ?? channel.scanCount) > 0 ? Math.round(channel.budget / (stats?.accessCount ?? channel.scanCount)).toLocaleString() : "-"}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">CTA</span>
            <span className="font-bold text-purple-600">{stats?.ctaCount?.toLocaleString() ?? "-"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">CTA率</span>
            <span className="font-bold text-orange-600">{stats && stats.accessCount > 0 ? `${stats.ctaRate}%` : "-"}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  );
}
