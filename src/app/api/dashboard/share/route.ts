import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 共有トークンの状態を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: { shareToken: true },
    });

    return NextResponse.json({
      shareToken: clinic?.shareToken || null,
    });
  } catch (error) {
    console.error("Share token GET error:", error);
    return NextResponse.json(
      { error: "共有情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 共有トークンを生成（既にあれば再生成）
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 32バイトのランダムトークンを生成（URL-safe）
    const token = crypto.randomBytes(32).toString("base64url");

    const clinic = await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { shareToken: token },
      select: { shareToken: true },
    });

    return NextResponse.json({
      shareToken: clinic.shareToken,
    });
  } catch (error) {
    console.error("Share token POST error:", error);
    return NextResponse.json(
      { error: "共有リンクの生成に失敗しました" },
      { status: 500 }
    );
  }
}

// 共有トークンを無効化（共有OFF）
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    await prisma.clinic.update({
      where: { id: session.clinicId },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Share token DELETE error:", error);
    return NextResponse.json(
      { error: "共有の無効化に失敗しました" },
      { status: 500 }
    );
  }
}
