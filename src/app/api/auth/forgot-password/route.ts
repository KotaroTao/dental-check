import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // A1: レート制限（1つのIPから15分間に5回まで）
  const rateLimitResponse = checkRateLimit(request, "auth-forgot", 5, 15 * 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // 常に同じレスポンスを返す（メールの存在を漏らさない）
    const successMessage = "パスワードリセット用のURLを発行しました";

    const clinic = await prisma.clinic.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!clinic) {
      // メールが存在しなくても同じレスポンス
      return NextResponse.json({ success: true, message: successMessage });
    }

    // 既存の未使用リセットトークンを無効化
    await prisma.invitationToken.updateMany({
      where: {
        clinicId: clinic.id,
        type: "password_reset",
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 新しいリセットトークンを発行（1時間有効）
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.invitationToken.create({
      data: {
        clinicId: clinic.id,
        token,
        type: "password_reset",
        expiresAt,
      },
    });

    // A2: resetUrl をレスポンスに含めない
    // TODO: メール送信機能を実装した場合はここで送信
    // 現時点ではトークンをDB保存のみ（管理者がDB上で確認する運用）

    return NextResponse.json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "処理に失敗しました" },
      { status: 500 }
    );
  }
}
