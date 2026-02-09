import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTOTPSecret, generateTOTPKeyUri, verifyTOTP } from "@/lib/totp";
import QRCode from "qrcode";

/**
 * GET: 2FAセットアップ開始（QRコードを生成して返す）
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 新しいシークレットを生成
    const secret = generateTOTPSecret();
    const keyUri = generateTOTPKeyUri(secret, session.email);

    // QRコード画像をBase64で生成
    const qrCodeDataUrl = await QRCode.toDataURL(keyUri);

    // シークレットを一時的にDBに保存（まだ有効化はしない）
    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { totpSecret: secret, totpEnabled: false },
    });

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      secret, // 手動入力用にシークレットも返す
      message: "認証アプリでQRコードを読み取り、表示されたコードを入力してください",
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "2FA設定の開始に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST: 2FAを有効化（TOTPコードを検証して有効化）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "認証コードを入力してください" },
        { status: 400 }
      );
    }

    // 現在のシークレットを取得
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { totpSecret: true, totpEnabled: true },
    });

    if (!clinic?.totpSecret) {
      return NextResponse.json(
        { error: "先に2FAセットアップを開始してください" },
        { status: 400 }
      );
    }

    if (clinic.totpEnabled) {
      return NextResponse.json(
        { error: "2FAは既に有効です" },
        { status: 400 }
      );
    }

    // コードを検証
    const isValid = verifyTOTP(clinic.totpSecret, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "認証コードが正しくありません。もう一度お試しください" },
        { status: 400 }
      );
    }

    // 2FAを有効化
    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { totpEnabled: true },
    });

    return NextResponse.json({
      success: true,
      message: "2段階認証を有効にしました",
    });
  } catch (error) {
    console.error("TOTP enable error:", error);
    return NextResponse.json(
      { error: "2FAの有効化に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 2FAを無効化（パスワード確認必須）
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "パスワードを入力してください" },
        { status: 400 }
      );
    }

    // パスワードを検証（セキュリティのため）
    const { verifyPassword } = await import("@/lib/auth");
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { passwordHash: true, totpEnabled: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
    }

    if (!clinic.totpEnabled) {
      return NextResponse.json(
        { error: "2FAは有効になっていません" },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password, clinic.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }

    // 2FAを無効化
    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { totpSecret: null, totpEnabled: false },
    });

    return NextResponse.json({
      success: true,
      message: "2段階認証を無効にしました",
    });
  } catch (error) {
    console.error("TOTP disable error:", error);
    return NextResponse.json(
      { error: "2FAの無効化に失敗しました" },
      { status: 500 }
    );
  }
}
