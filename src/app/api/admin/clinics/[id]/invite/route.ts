import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 招待トークンを発行・再発行
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
      select: { id: true, name: true, email: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    // 既存の未使用招待トークンを無効化
    await prisma.invitationToken.updateMany({
      where: {
        clinicId: id,
        type: "invitation",
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // 使用済みにして無効化
      },
    });

    // 新しいトークンを発行（無期限）
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date("2099-12-31T23:59:59Z");

    await prisma.invitationToken.create({
      data: {
        clinicId: id,
        token,
        type: "invitation",
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || new URL(request.url).origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      message: "招待URLを発行しました",
    });
  } catch (error) {
    console.error("Generate invitation error:", error);
    return NextResponse.json(
      { error: "招待URLの発行に失敗しました" },
      { status: 500 }
    );
  }
}
