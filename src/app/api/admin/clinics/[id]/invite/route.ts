import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import { sendInvitationEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
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

    const baseUrl = getBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // D1: 招待メールを送信（SMTP設定時のみ）
    let emailSent = false;
    if (clinic.email) {
      emailSent = await sendInvitationEmail(
        clinic.email,
        clinic.name || "ご利用者",
        inviteUrl
      );
    }

    // D3: 監査ログ
    await createAuditLog({
      adminId: session.adminId,
      action: "invitation.create",
      targetType: "clinic",
      targetId: clinic.id,
      details: { clinicName: clinic.name, emailSent },
      request,
    });

    return NextResponse.json({
      success: true,
      inviteUrl,
      emailSent,
      expiresAt: expiresAt.toISOString(),
      message: emailSent
        ? "招待URLを発行し、メールを送信しました"
        : "招待URLを発行しました（メール送信はスキップ）",
    });
  } catch (error) {
    console.error("Generate invitation error:", error);
    return NextResponse.json(
      { error: "招待URLの発行に失敗しました" },
      { status: 500 }
    );
  }
}
