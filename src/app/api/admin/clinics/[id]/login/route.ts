import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";

// 管理者として医院にログイン
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

    // 医院用のトークンを作成（管理者フラグ付き）
    const token = await createToken({
      clinicId: clinic.id,
      email: clinic.email,
      isAdmin: true,
    });

    // クッキーを設定してレスポンス
    const response = NextResponse.json({
      success: true,
      message: `${clinic.name}にログインしました`,
      clinicId: clinic.id,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin clinic login error:", error);
    return NextResponse.json(
      { error: "ログインに失敗しました" },
      { status: 500 }
    );
  }
}
