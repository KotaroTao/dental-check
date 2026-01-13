import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

// 管理者用: 医院一覧取得（認証済み）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, search } = body;

    // 管理者認証
    if (!email || !password) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // 医院一覧を取得
    const clinics = await prisma.clinic.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        status: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({ clinics });
  } catch (error) {
    console.error("Get clinics for admin error:", error);
    return NextResponse.json(
      { error: "医院一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
