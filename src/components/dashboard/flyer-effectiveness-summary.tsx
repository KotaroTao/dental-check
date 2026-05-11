"use client";

import { useEffect, useState } from "react";
import { Loader2, Layers } from "lucide-react";

// チラシ単位の効果測定サマリー（旧 EffectivenessSummary の QR版を置き換えるもの）
// 表示する 4 指標:
//   配布枚数 = Σ flyer.distributionQuantity
//   QRスキャン = Σ Σ channel.scans
//   QRスキャン率 = QRスキャン ÷ 配布枚数（% 表示）
//   QRスキャン単価 = 予算合計 ÷ QRスキャン（¥ 表示）
//
// 設計判断: 期間フィルタは持たない。
// 「配布枚数 / 予算」はチラシ全期間で固定値、「スキャン」は配布後に累積していくため、
// 短期間で絞ると「率」「単価」が誤解を招く（分母は全期間固定なのに分子だけ短期、になる）。
// よって効果測定は常に「チラシ累計」で評価する。
// チラシ自体の配布期間（テキスト）は各チラシ編集ページで参照できる。

interface FlyerData {
  id: string;
  name: string;
  distributionQuantity: number | null;
  budget: number | null;
  channels: Array<{ id: string; name: string; scans: number }>;
}

export function FlyerEffectivenessSummary() {
  const [flyers, setFlyers] = useState<FlyerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 期間指定なし = 全期間でスキャンを集計
        const response = await fetch("/api/flyers");
        if (!response.ok) {
          if (mounted) setError("データの取得に失敗しました");
          return;
        }
        const data = await response.json();
        if (mounted) {
          setFlyers(data.flyers);
          setError("");
        }
      } catch {
        if (mounted) setError("通信エラーが発生しました");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 合算値
  const totalQuantity = flyers.reduce(
    (acc, f) => acc + (f.distributionQuantity ?? 0),
    0
  );
  const totalBudget = flyers.reduce((acc, f) => acc + (f.budget ?? 0), 0);
  const totalScans = flyers.reduce(
    (acc, f) => acc + f.channels.reduce((s, c) => s + c.scans, 0),
    0
  );
  const scanRate = totalQuantity > 0 ? (totalScans / totalQuantity) * 100 : null;
  const costPerScan =
    totalBudget > 0 && totalScans > 0 ? Math.round(totalBudget / totalScans) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border">
      <div className="p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">効果測定サマリー</h2>
            <p className="text-xs text-gray-500">全チラシの累計データ（{flyers.length}件のチラシ）</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-red-600">{error}</div>
      ) : flyers.length === 0 ? (
        <div className="p-10 text-center text-gray-500 text-sm">
          まだチラシがありません。チラシ管理画面から作成してください。
        </div>
      ) : (
        <div className="p-5">
          {/* iPad縦/スマホでは 2列 × 2行、PCワイドで 4列横並び */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile
              label="配布枚数"
              value={totalQuantity > 0 ? `${totalQuantity.toLocaleString()}枚` : ""}
              missing={totalQuantity <= 0}
              color="text-gray-800"
            />
            <Tile
              label="QRスキャン"
              value={totalScans.toLocaleString()}
              color="text-blue-600"
            />
            <Tile
              label="QRスキャン率"
              value={scanRate !== null ? `${scanRate.toFixed(2)}%` : ""}
              missing={scanRate === null}
              sub="QRスキャン÷配布枚数"
              color="text-blue-600"
            />
            <Tile
              label="QRスキャン単価"
              value={
                costPerScan !== null
                  ? `¥${costPerScan.toLocaleString()}`
                  : totalBudget <= 0
                  ? ""
                  : "—"
              }
              missing={totalBudget <= 0}
              sub="予算÷QRスキャン"
              color="text-amber-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  color,
  missing,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  missing?: boolean;
}) {
  const displayValue = missing ? "データ未入力" : value;
  const valueColor = missing ? "text-red-600" : color || "text-gray-800";
  const valueSize = missing ? "text-sm" : "text-2xl";
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`${valueSize} font-bold tabular-nums ${valueColor}`}>
        {displayValue}
      </div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
