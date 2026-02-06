import { NextRequest } from "next/server";

export function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  const origin = request.headers.get("origin");
  if (origin) return origin;

  // リバースプロキシ経由の場合、x-forwarded-host / host ヘッダーを使用
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
