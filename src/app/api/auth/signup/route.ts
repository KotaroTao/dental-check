import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import type { Clinic } from "@/types/clinic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "医院名、メールアドレス、パスワードは必須です" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existingClinic = await prisma.clinic.findUnique({
      where: { email },
    });

    if (existingClinic) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    // スラッグを生成（ランダムな文字列）
    const slug = generateSlug();

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // 医院を作成
    const clinic = (await prisma.clinic.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        slug,
        status: "trial",
      },
    })) as Clinic;

    // トライアル期間を設定（14日間）
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await prisma.subscription.create({
      data: {
        clinicId: clinic.id,
        status: "trial",
        trialEnd,
      },
    });

    // JWTトークンを生成
    const token = await createToken({
      clinicId: clinic.id,
      email: clinic.email,
    });

    // レスポンスを作成
    const response = NextResponse.json(
      {
        message: "登録が完了しました",
        clinic: {
          id: clinic.id,
          name: clinic.name,
          email: clinic.email,
          slug: clinic.slug,
        },
      },
      { status: 201 }
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
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "登録に失敗しました。しばらく経ってから再度お試しください" },
      { status: 500 }
    );
  }
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
