"use client";

// 効果測定ページ（Phase 3 で /dashboard から独立、URL は /dashboard/analytics）
// 表示構成:
//   1) ヘッダ（期間フィルタ・チラシ管理に戻るリンク）
//   2) CTA未設定アラート（既存）
//   3) チラシ単位の効果測定サマリー（新規・FlyerEffectivenessSummary）
//   4) チラシで絞り込みチップ + QR読み込みエリア（地図）
//   5) QR読み込み履歴
// 旧仕様（QRコードセクション・QR個別のCTA内訳・性別年齢層タイル）は撤去。
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  History,
  MapPin,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { CTAAlert } from "@/components/dashboard/cta-alert";
import { LocationSection } from "@/components/dashboard/location-section";
import { FlyerEffectivenessSummary } from "@/components/dashboard/flyer-effectiveness-summary";

interface ChannelLite {
  id: string;
  name: string;
  isActive: boolean;
  channelType: "diagnosis" | "link";
}

interface HistoryItem {
  id: string;
  completedAt: string;
  channelName: string | null;
  resultName: string | null;
  age: number | null;
  gender: string | null;
  ctaClickCount: number;
}

interface FlyerLite {
  id: string;
  name: string;
  channels: Array<{ id: string; name: string; channelType: "diagnosis" | "link" }>;
}

const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
  { value: "all", label: "全期間" },
  { value: "custom", label: "期間指定" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [flyers, setFlyers] = useState<FlyerLite[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // チラシ選択（QR読み込みエリア・履歴用）。初期値は全チラシ選択。
  const [selectedFlyerIds, setSelectedFlyerIds] = useState<string[]>([]);

  // 初回ロード: チラシ一覧（チャネルも含む）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/flyers");
        if (r.ok) {
          const data = await r.json();
          const list: FlyerLite[] = data.flyers.map(
            (f: { id: string; name: string; channels?: FlyerLite["channels"] }) => ({
              id: f.id,
              name: f.name,
              channels: f.channels || [],
            })
          );
          if (mounted) {
            setFlyers(list);
            setSelectedFlyerIds(list.map((f) => f.id));
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 履歴フェッチ。期間が変わったら再取得（チラシ絞り込みはクライアント側で）。
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (period === "custom" && customStartDate && customEndDate) {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }
      const r = await fetch(`/api/dashboard/history?${params}`);
      if (r.ok) {
        const data = await r.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [period, customStartDate, customEndDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // チラシ選択トグル
  const toggleFlyer = (id: string) => {
    setSelectedFlyerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAllFlyers = () => setSelectedFlyerIds(flyers.map((f) => f.id));
  const clearFlyers = () => setSelectedFlyerIds([]);
  const isAllSelected =
    selectedFlyerIds.length === flyers.length && flyers.length > 0;

  // 選択中チラシ配下のチャネルを LocationSection に渡す
  const channelsForLocation: ChannelLite[] = flyers
    .filter((f) => selectedFlyerIds.includes(f.id))
    .flatMap((f) =>
      f.channels.map((c) => ({
        id: c.id,
        name: c.name,
        isActive: true,
        channelType: c.channelType,
      }))
    );

  // 選択中チラシ配下のチャネル名で履歴を絞り込み
  const selectedChannelNames = new Set(channelsForLocation.map((c) => c.name));
  const filteredHistory = history.filter(
    (h) => h.channelName === null || selectedChannelNames.has(h.channelName)
  );

  return (
    <div className="space-y-6">
      {/* ヘッダ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="チラシ管理に戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">効果測定</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              チラシ単位で配布効果を測定します
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border rounded-lg px-1 py-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === opt.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm bg-transparent outline-none"
              />
              <span className="text-gray-400">〜</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm bg-transparent outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* CTA未設定アラート（既存） */}
      <CTAAlert />

      {/* チラシ単位の効果測定サマリー */}
      <FlyerEffectivenessSummary
        period={period}
        customStartDate={period === "custom" ? customStartDate : undefined}
        customEndDate={period === "custom" ? customEndDate : undefined}
      />

      {/* チラシで絞り込み（QR読み込みエリア・履歴の絞り込みに使う） */}
      {flyers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                チラシで絞り込み
              </h2>
              <p className="text-xs text-gray-500">
                下のQR読み込みエリア・履歴に反映されます
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2 text-xs">
            <button
              onClick={isAllSelected ? clearFlyers : selectAllFlyers}
              className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              {isAllSelected ? "全て解除" : "全て選択"}
            </button>
            <span className="text-gray-500">
              {selectedFlyerIds.length}件 / {flyers.length}件
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {flyers.map((f) => {
              const checked = selectedFlyerIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFlyer(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    checked
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QR読み込みエリア（地図） */}
      <div className="bg-white rounded-2xl shadow-sm border">
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                QR読み込みエリア
              </h2>
              <p className="text-xs text-gray-500">
                選択中のチラシ配下のQRが読み込まれた地域を表示
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          {selectedFlyerIds.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              上で1つ以上のチラシを選択してください
            </div>
          ) : (
            <LocationSection
              period={period}
              channels={channelsForLocation}
              customStartDate={
                period === "custom" ? customStartDate : undefined
              }
              customEndDate={period === "custom" ? customEndDate : undefined}
            />
          )}
        </div>
      </div>

      {/* QR読み込み履歴 */}
      <div className="bg-white rounded-2xl shadow-sm border">
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">QR読み込み履歴</h2>
              <p className="text-xs text-gray-500">
                {filteredHistory.length}件（選択中のチラシ配下）
              </p>
            </div>
          </div>
        </div>
        {isLoadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">
            該当する履歴がありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    日時
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    QRコード
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    年齢
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    性別
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    結果
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    CTA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.slice(0, 50).map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {new Date(h.completedAt).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {h.channelName || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {h.age !== null ? `${h.age}歳` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {h.gender || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {h.resultName || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 tabular-nums">
                      {h.ctaClickCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredHistory.length > 50 && (
              <div className="text-center text-xs text-gray-400 py-3 border-t">
                最新50件を表示（全{filteredHistory.length}件中）
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
