import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Clinic } from "@/types/clinic";

/** ログイン失敗の上限回数（これを超えるとアカウントロック） */
const MAX_FAILED_ATTEMPTS = 10;
/** ロック時間（ミリ秒）: 5分 */
const LOCK_DURATION_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  // A1: レート制限（1つのIPから15分間に30回まで）
  const rateLimitResponse = checkRateLimit(request, "auth-login", 30, 15 * 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードを入力してください" },
        { status: 400 }
      );
    }

    // 医院を検索
    const clinic = (await prisma.clinic.findUnique({
      where: { email },
      include: {
        subscription: true,
      },
    })) as (Clinic & { failedLoginAttempts: number; lockedUntil: Date | null }) | null;

    if (!clinic) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // A4: アカウントロック中かチェック
    if (clinic.lockedUntil && new Date() < clinic.lockedUntil) {
      const remainingMs = clinic.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        {
          error: `セキュリティのためアカウントが一時的にロックされています。${remainingMin}分後に再度お試しください`,
        },
        { status: 423 }
      );
    }

    // パスワードを検証
    const isValid = await verifyPassword(password, clinic.passwordHash);

    if (!isValid) {
      // A4: 失敗回数を加算し、上限を超えたらロック
      const newAttempts = clinic.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.clinic.update({
        where: { id: clinic.id },
        data: {
          failedLoginAttempts: newAttempts,
          ...(shouldLock
            ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
            : {}),
        },
      });

      if (shouldLock) {
        const lockMin = Math.ceil(LOCK_DURATION_MS / 60000);
        return NextResponse.json(
          {
            error: `ログイン試行回数の上限に達しました。セキュリティのため${lockMin}分間ロックされます`,
          },
          { status: 423 }
        );
      }

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      return NextResponse.json(
        {
          error: `メールアドレスまたはパスワードが正しくありません（あと${remaining}回試行できます）`,
        },
        { status: 401 }
      );
    }

    // ログイン成功 → 失敗カウンターとロックをリセット
    if (clinic.failedLoginAttempts > 0 || clinic.lockedUntil) {
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // アカウントステータスをチェック
    if (clinic.status === "suspended") {
      return NextResponse.json(
        { error: "このアカウントは停止されています" },
        { status: 403 }
      );
    }

    // JWTトークンを生成
    const token = await createToken({
      clinicId: clinic.id,
      email: clinic.email,
    });

    // レスポンスを作成
    const response = NextResponse.json(
      {
        message: "ログインしました",
        clinic: {
          id: clinic.id,
          name: clinic.name,
          email: clinic.email,
          slug: clinic.slug,
          status: clinic.status,
          subscription: clinic.subscription
            ? {
                status: clinic.subscription.status,
                trialEnd: clinic.subscription.trialEnd,
              }
            : null,
        },
      },
      { status: 200 }
    );

    // Cookieにトークンを設定
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "ログインに失敗しました。しばらく経ってから再度お試しください" },
      { status: 500 }
    );
  }
}
