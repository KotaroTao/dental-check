import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "./lib/jwt-secret";

// 認証が必要なパス
const protectedPaths = ["/dashboard"];

// 認証済みユーザーがアクセスできないパス（ログイン済みならダッシュボードへ）
const authPaths = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // トークンの検証
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 保護されたパスへのアクセス
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 認証ページへのアクセス（ログイン済みならダッシュボードへ）
  if (authPaths.some((path) => pathname.startsWith(path))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
