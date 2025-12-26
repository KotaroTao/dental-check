import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import type { Clinic } from "@/types/clinic";

export async function POST(request: NextRequest) {
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
    })) as Clinic | null;

    if (!clinic) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // パスワードを検証
    const isValid = await verifyPassword(password, clinic.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが正しくありません" },
        { status: 401 }
      );
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
