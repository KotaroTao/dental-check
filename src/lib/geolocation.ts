/**
 * IP地域推定ライブラリ
 * ip-api.com を使用してIPアドレスから地域情報を取得
 */

export interface GeoLocation {
  country: string; // "Japan"
  countryCode: string; // "JP"
  region: string; // "28" (地域コード)
  regionName: string; // "兵庫県"
  city: string; // "Nishinomiya" or "西宮市"
  lat: number; // 34.7333
  lon: number; // 135.3417
}

/**
 * IPアドレスから地域情報を取得
 * @param ip IPアドレス
 * @returns 地域情報またはnull
 */
export async function getLocationFromIP(
  ip: string
): Promise<GeoLocation | null> {
  // ローカル/プライベートIPはスキップ
  if (
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return null;
  }

  try {
    // ip-api.com（無料、45req/分）
    const response = await fetch(
      `http://ip-api.com/json/${ip}?lang=ja&fields=status,country,countryCode,region,regionName,city,lat,lon`,
      { next: { revalidate: 86400 } } // 24時間キャッシュ
    );

    if (!response.ok) {
      console.error("IP API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== "success") {
      return null;
    }

    return {
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      lat: data.lat,
      lon: data.lon,
    };
  } catch (error) {
    console.error("Failed to get location from IP:", error);
    return null;
  }
}

/**
 * リクエストからIPアドレスを取得
 * @param request NextRequest
 * @returns IPアドレス
 */
export function getClientIP(request: Request): string {
  // Cloudflare
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;

  // X-Forwarded-For（プロキシ経由）
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // X-Real-IP（Nginx等）
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  return "unknown";
}
