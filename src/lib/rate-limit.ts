import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "./geolocation";

/**
 * インメモリ レート制限
 *
 * 仕組み: IPアドレスごとに「一定時間内のリクエスト数」を数える。
 * 上限を超えたらHTTP 429（Too Many Requests）を返す。
 *
 * 注意: サーバーのメモリに保持するため、再起動するとリセットされる。
 * 複数サーバー構成では Redis 等に置き換えが必要。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // ミリ秒タイムスタンプ
}

// IPアドレスごとのリクエスト記録を保持するMap
// キー: "エンドポイント名:IPアドレス" → 値: カウントとリセット時刻
const rateLimitStore = new Map<string, RateLimitEntry>();

// 古いエントリを定期的に掃除（メモリリーク防止）
// 5分ごとに期限切れのエントリを削除
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * レート制限チェック
 * @param request - リクエストオブジェクト
 * @param endpoint - エンドポイント識別名（例: "track-access"）
 * @param maxRequests - ウィンドウ内の最大リクエスト数
 * @param windowMs - 時間ウィンドウ（ミリ秒）
 * @returns 制限超過の場合は429レスポンス、OK の場合は null
 */
export function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIP(request);
  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // エントリがない、または期限切れ → 新規カウント開始
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null; // OK
  }

  // カウントを増やす
  entry.count++;

  // 上限超過
  if (entry.count > maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSec.toString(),
        },
      }
    );
  }

  return null; // OK
}
