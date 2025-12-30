import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canTrackSession } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, ctaType } = body;

    if (!sessionId || !ctaType) {
      return NextResponse.json(
        { error: "sessionId and ctaType are required" },
        { status: 400 }
      );
    }

    // セッションからチャンネルと医院IDを取得
    const session = await prisma.diagnosisSession.findUnique({
      where: { id: sessionId },
      select: {
        clinicId: true,
        channelId: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const clinicId = session.clinicId;
    const channelId = session.channelId;

    // 契約状態をチェック - 契約が無効な場合は計測をスキップ
    if (clinicId) {
      const canTrack = await canTrackSession(clinicId);
      if (!canTrack) {
        return NextResponse.json({ success: true, tracked: false });
      }
    }

    // CTAクリックを記録
    await prisma.cTAClick.create({
      data: {
        sessionId,
        clinicId,
        channelId,
        ctaType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track CTA click error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
