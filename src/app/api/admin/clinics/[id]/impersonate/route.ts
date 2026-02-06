import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 管理者として医院にログイン（なりすまし）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    // 医院用のauth_tokenを発行
    const authToken = await createToken({
      clinicId: clinic.id,
      email: clinic.email,
    });

    const response = NextResponse.json({
      success: true,
      message: `${clinic.name}のダッシュボードにログインしました`,
    });

    // auth_tokenをセット（admin_auth_tokenは既にブラウザにある）
    response.cookies.set("auth_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1日（短めに設定）
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin impersonate error:", error);
    return NextResponse.json(
      { error: "ログインに失敗しました" },
      { status: 500 }
    );
  }
}
