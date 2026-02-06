"use client";

import Link from "next/link";
import { Target, Check, SquareCheck, Square, Wallet } from "lucide-react";
import type { Channel, OverallStats } from "./types";
import { CHANNEL_COLORS, AGE_RANGE_LABELS, CTA_TYPE_NAMES } from "./types";

export function EffectivenessSummary({
  channels,
  overallStats,
  summaryChannelIds,
  setSummaryChannelIds,
  isDemo,
  onDemoClick,
}: {
  channels: Channel[];
  overallStats: OverallStats | null;
  summaryChannelIds: string[];
  setSummaryChannelIds: (ids: string[]) => void;
  isDemo?: boolean;
  onDemoClick?: () => void;
}) {

  const activeChannels = channels.filter((c) => c.isActive);

  // チャンネルIDと色のマッピング
  const channelColorMap: Record<string, string> = {};
  activeChannels.forEach((channel, index) => {
    channelColorMap[channel.id] = CHANNEL_COLORS[index % CHANNEL_COLORS.length];
  });

  const isAllSelected = summaryChannelIds.length === activeChannels.length;
  const isNoneSelected = summaryChannelIds.length === 0;

  const toggleChannel = (channelId: string) => {
    if (summaryChannelIds.includes(channelId)) {
      const newIds = summaryChannelIds.filter((id) => id !== channelId);
      setSummaryChannelIds(newIds);
    } else {
      const newIds = [...summaryChannelIds, channelId];
      setSummaryChannelIds(newIds);
    }
  };

  const selectAll = () => {
    setSummaryChannelIds(activeChannels.map((c) => c.id));
  };

  const deselectAll = () => {
    setSummaryChannelIds([]);
  };

  const isChannelSelected = (channelId: string) => {
    return summaryChannelIds.includes(channelId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border">
      <div className="p-5 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">効果測定サマリー</h2>
            <p className="text-xs text-gray-500">
              {isNoneSelected
                ? "QRコードを選択してください"
                : isAllSelected
                  ? "全QRコードの集計データ"
                  : `${summaryChannelIds.length}個のQRコードを選択中`}
            </p>
          </div>
        </div>

        {/* チャンネル選択バナー */}
        {activeChannels.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm text-gray-600 font-medium">QRコード:</span>
            <button
              onClick={selectAll}
              className={`text-xs px-2 py-1 rounded bg-white/80 hover:bg-white text-gray-700 flex items-center gap-1 ${isAllSelected ? "ring-1 ring-emerald-500" : ""}`}
            >
              <SquareCheck className="w-3 h-3" />
              全選択
            </button>
            <button
              onClick={deselectAll}
              className={`text-xs px-2 py-1 rounded bg-white/80 hover:bg-white text-gray-700 flex items-center gap-1 ${isNoneSelected ? "ring-1 ring-gray-400" : ""}`}
            >
              <Square className="w-3 h-3" />
              全解除
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeChannels.map((channel) => {
              const isSelected = isChannelSelected(channel.id);
              const color = channelColorMap[channel.id];
              return (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
                    isSelected
                      ? "border-current bg-white"
                      : "border-gray-200 text-gray-400 bg-white/50"
                  }`}
                  style={isSelected ? { color, backgroundColor: "white" } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isSelected ? color : "#d1d5db" }}
                  />
                  {channel.name}
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
        ) : (
          <p className="text-sm text-gray-500">表示できるQRコードがありません</p>
        )}
      </div>

      {activeChannels.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <Target className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-sm text-gray-500">有効なQRコードがありません</p>
          <p className="text-xs text-gray-400 mt-1">
            QRコードを作成するか、非表示のQRコードを復元してください
          </p>
        </div>
      ) : isNoneSelected ? (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <Target className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-sm text-gray-500">QRコードを選択してください</p>
          <p className="text-xs text-gray-400 mt-1">
            上のQRコードラベルをクリックして選択できます
          </p>
        </div>
      ) : overallStats && (overallStats.accessCount > 0 || overallStats.completedCount > 0) ? (
        <div className="p-5 space-y-4">
          {/* メイン指標: QR読み込み回数 & 読み込み単価 & CTAクリック数 & CTA率 */}
          {(() => {
            const selectedChannels = activeChannels.filter(c => summaryChannelIds.includes(c.id));
            const totalBudget = selectedChannels.reduce((sum, c) => sum + (c.budget || 0), 0);
            const isSingleChannel = selectedChannels.length === 1;
            const singleChannel = isSingleChannel ? selectedChannels[0] : null;
            const hasBudget = totalBudget > 0;
            const costPerAccess = hasBudget && overallStats.accessCount > 0
              ? Math.round(totalBudget / overallStats.accessCount)
              : null;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* QR読み込み回数 */}
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">QR読み込み回数</div>
                  <div className="text-3xl font-bold text-emerald-600">{overallStats.accessCount.toLocaleString()}</div>
                  {overallStats.trends?.accessCount && (
                    <div className={`text-xs mt-1 ${overallStats.trends.accessCount.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {overallStats.trends.accessCount.isNew ? "NEW" : `前期比 ${overallStats.trends.accessCount.value >= 0 ? "+" : ""}${overallStats.trends.accessCount.value}%`}
                    </div>
                  )}
                </div>

                {/* QR読み込み単価 */}
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <Wallet className="w-3 h-3" />
                    読み込み単価
                  </div>
                  {hasBudget ? (
                    <>
                      <div className="text-3xl font-bold text-blue-600">
                        ¥{costPerAccess?.toLocaleString() || "-"}
                      </div>
                      {!isSingleChannel && (
                        <div className="text-xs text-gray-500 mt-1">
                          {selectedChannels.length}個のQRの合計予算
                        </div>
                      )}
                    </>
                  ) : isSingleChannel && singleChannel ? (
                    <div className="py-1">
                      <div className="text-sm text-gray-400 mb-1">予算未設定</div>
                      {isDemo ? (
                        <button
                          onClick={onDemoClick}
                          className="text-xs text-gray-400 hover:text-gray-500"
                        >
                          予算を設定する →
                        </button>
                      ) : (
                        <Link
                          href={`/dashboard/channels/${singleChannel.id}#budget`}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          予算を設定する →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="py-1">
                      <div className="text-sm text-gray-400">予算未設定</div>
                      <div className="text-xs text-gray-400 mt-1">
                        各QRに予算を設定してください
                      </div>
                    </div>
                  )}
                </div>

                {/* CTAクリック数 */}
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">CTAクリック数</div>
                  <div className="text-3xl font-bold text-purple-600">{overallStats.ctaCount.toLocaleString()}</div>
                  {overallStats.trends?.ctaCount && (
                    <div className={`text-xs mt-1 ${overallStats.trends.ctaCount.value >= 0 ? "text-purple-600" : "text-red-500"}`}>
                      {overallStats.trends.ctaCount.isNew ? "NEW" : `前期比 ${overallStats.trends.ctaCount.value >= 0 ? "+" : ""}${overallStats.trends.ctaCount.value}%`}
                    </div>
                  )}
                </div>

                {/* CTA率 */}
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">CTA率</div>
                  <div className="text-3xl font-bold text-orange-600">{overallStats.ctaRate}%</div>
                </div>
              </div>
            );
          })()}

          {/* 性別・年齢層・CTA内訳 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 性別 */}
            {overallStats.genderByType && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">性別</div>
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-2 bg-blue-100 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{overallStats.genderByType.male || 0}</div>
                    <div className="text-xs text-gray-500">男性</div>
                  </div>
                  <div className="flex-1 text-center p-2 bg-pink-100 rounded-lg">
                    <div className="text-lg font-bold text-pink-600">{overallStats.genderByType.female || 0}</div>
                    <div className="text-xs text-gray-500">女性</div>
                  </div>
                  {(overallStats.genderByType.other || 0) > 0 && (
                    <div className="flex-1 text-center p-2 bg-gray-100 rounded-lg">
                      <div className="text-lg font-bold text-gray-600">{overallStats.genderByType.other}</div>
                      <div className="text-xs text-gray-500">その他</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 年齢層 */}
            {overallStats.ageRanges && Object.keys(overallStats.ageRanges).length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">年齢層</div>
                <div className="space-y-1">
                  {AGE_RANGE_LABELS.filter(range => (overallStats.ageRanges[range] || 0) > 0).map((range) => {
                    const count = overallStats.ageRanges[range] || 0;
                    const maxCount = Math.max(...Object.values(overallStats.ageRanges), 1);
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div key={range} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">{range}歳</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA内訳 */}
            {overallStats.ctaByType && Object.keys(overallStats.ctaByType).length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-gray-700 mb-3">CTA内訳</div>
                <div className="space-y-2">
                  {Object.entries(overallStats.ctaByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{CTA_TYPE_NAMES[type] || type}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${overallStats.ctaCount > 0 ? (count / overallStats.ctaCount) * 100 : 0}%` }}
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
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <Target className="w-12 h-12 mx-auto opacity-50" />
          </div>
          <p className="text-sm text-gray-500">
            {summaryChannelIds.length > 0
              ? "選択したQRコードのデータがありません"
              : "データがありません"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            選択した期間にアクセスや診断完了がない場合は表示されません
          </p>
        </div>
      )}
    </div>
  );
}
