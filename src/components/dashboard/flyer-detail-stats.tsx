"use client";

// FlyerCard の折りたたみ「詳細統計」セクション
// クリックで開閉。開いた時に初めて API をフェッチ（性能・パケット節約）。
// 表示する内容:
//   - 性別の内訳（バー）
//   - 年齢層の内訳（10歳刻みのバー）
//   - QR読み込みエリア（既存 LocationSection を再利用）
//   - QR読み込み履歴（このチラシ配下のチャネル分のみ）
//
// 注意: マップは Leaflet で重いので、必要な時だけマウントする（折りたたみ閉時はアンマウント）
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp, Loader2, History, MapPin, Users } from "lucide-react";

// LocationSection はマップ（Leaflet）を含み重いので動的import + SSR無効化
const LocationSection = dynamic(
  () =>
    import("@/components/dashboard/location-section").then(
      (m) => m.LocationSection
    ),
  { ssr: false, loading: () => <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> }
);

interface ChannelLite {
  id: string;
  name: string;
  channelType: "diagnosis" | "link";
  isActive: boolean;
}

interface HistoryItem {
  id: string;
  createdAt: string;
  channelName: string | null;
  diagnosisType: string | null;
  resultCategory: string | null;
  userAge: number | null;
  userGender: string | null;
  area: string | null;
}

interface FlyerDetailStatsProps {
  flyerId: string;
  channels: ChannelLite[];
  // 管理者画面から呼ぶ場合は対象クリニックIDを渡す（dashboard APIで管理者経由として扱う）
  clinicId?: string;
}

export function FlyerDetailStats({ channels, clinicId }: FlyerDetailStatsProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 折りたたみが開かれた時に履歴をフェッチ。閉じている間はネットワーク発行しない。
  useEffect(() => {
    if (!open || history !== null) return; // 既に取得済みなら再取得しない
    const channelIds = channels.map((c) => c.id).join(",");
    if (!channelIds) return;
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams({
      period: "all",
      channelIds,
      limit: "500",
    });
    if (clinicId) params.set("clinicId", clinicId);
    fetch(`/api/dashboard/history?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setHistory(data.history || []))
      .catch(() => setError("履歴の取得に失敗しました"))
      .finally(() => setIsLoading(false));
  }, [open, channels, history, clinicId]);

  // 性別・年齢層の集計（履歴データから算出）
  const stats = aggregateGenderAge(history || []);

  // LocationSection に渡す channels の型は { id, name, isActive, channelType } を期待
  const channelsForLocation = channels.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: true, // 非表示QRの履歴も表示するため強制 true
    channelType: c.channelType,
  }));

  return (
    <div className="border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-1 h-8 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            詳細を閉じる
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            詳細統計を見る（性別・年齢・地図・履歴）
          </>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-2 rounded text-xs">
              {error}
            </div>
          )}

          {isLoading && history === null ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* 性別・年齢層 */}
              <DemographicsPanel stats={stats} total={history?.length ?? 0} />

              {/* QR読み込みエリア（地図） */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  QR読み込みエリア
                </div>
                {channels.length === 0 ? (
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
                    このチラシにはQRが紐付いていません
                  </div>
                ) : (
                  <LocationSection
                    period="all"
                    channels={channelsForLocation}
                    clinicId={clinicId}
                  />
                )}
              </div>

              {/* 履歴 */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  QR読み込み履歴（{history?.length ?? 0}件）
                </div>
                <HistoryList items={history ?? []} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 性別・年齢層パネル
function DemographicsPanel({
  stats,
  total,
}: {
  stats: ReturnType<typeof aggregateGenderAge>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 p-3 bg-gray-50 rounded">
        <Users className="w-3.5 h-3.5" />
        診断完了データがまだありません
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
          <Users className="w-3.5 h-3.5 text-pink-500" />
          性別
        </div>
        <div className="space-y-1.5">
          {stats.genders.map((g) => (
            <Bar key={g.label} label={g.label} count={g.count} total={total} color="bg-pink-400" />
          ))}
        </div>
      </div>
      <div className="bg-gray-50 rounded p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
          <Users className="w-3.5 h-3.5 text-violet-500" />
          年齢層
        </div>
        <div className="space-y-1.5">
          {stats.ages.map((a) => (
            <Bar key={a.label} label={a.label} count={a.count} total={total} color="bg-violet-400" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="w-14 text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-16 text-right tabular-nums text-gray-600 shrink-0">
        {count.toLocaleString()}件
      </div>
    </div>
  );
}

// 履歴リスト（カード形式・モバイル/PC両対応）
function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
        履歴がありません
      </div>
    );
  }
  return (
    <div className="border rounded divide-y max-h-96 overflow-y-auto">
      {items.slice(0, 50).map((h) => (
        <div key={h.id} className="p-2.5 text-xs space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-gray-800 break-words min-w-0 flex-1">
              {h.channelName || "—"}
            </div>
            <div className="text-gray-500 whitespace-nowrap shrink-0 tabular-nums">
              {new Date(h.createdAt).toLocaleString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-600">
            <span>
              {h.userAge !== null && h.userAge !== undefined ? `${h.userAge}歳` : "年齢不明"}
            </span>
            <span className="text-gray-300">・</span>
            <span>{h.userGender || "性別不明"}</span>
            {h.resultCategory && (
              <>
                <span className="text-gray-300">・</span>
                <span>結果: {h.resultCategory}</span>
              </>
            )}
          </div>
          {h.area && h.area !== "-" && (
            <div className="text-gray-500 break-words">📍 {h.area}</div>
          )}
        </div>
      ))}
      {items.length > 50 && (
        <div className="text-center text-[10px] text-gray-400 py-2">
          最新50件を表示（全{items.length}件中）
        </div>
      )}
    </div>
  );
}

// 履歴から性別・年齢層を集計
const AGE_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: "〜19歳", min: 0, max: 19 },
  { label: "20代", min: 20, max: 29 },
  { label: "30代", min: 30, max: 39 },
  { label: "40代", min: 40, max: 49 },
  { label: "50代", min: 50, max: 59 },
  { label: "60代〜", min: 60, max: 200 },
];

function aggregateGenderAge(items: HistoryItem[]) {
  const genderCount: Record<string, number> = {};
  const ageCount: Record<string, number> = {};
  for (const b of AGE_BUCKETS) ageCount[b.label] = 0;

  for (const h of items) {
    if (h.userGender) {
      genderCount[h.userGender] = (genderCount[h.userGender] || 0) + 1;
    }
    if (h.userAge !== null && h.userAge !== undefined) {
      const bucket = AGE_BUCKETS.find(
        (b) => h.userAge! >= b.min && h.userAge! <= b.max
      );
      if (bucket) ageCount[bucket.label]++;
    }
  }
  return {
    genders: Object.entries(genderCount)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    ages: AGE_BUCKETS.map((b) => ({ label: b.label, count: ageCount[b.label] })),
  };
}
