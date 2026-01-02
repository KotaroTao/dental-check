import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canTrackSession } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, ctaType, sessionId } = body;

    if (!channelId || !ctaType) {
      return NextResponse.json(
        { error: "channelId and ctaType are required" },
        { status: 400 }
      );
    }

    // チャンネルから医院IDを取得
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { clinicId: true },
    });
    const clinicId = channel?.clinicId || null;

    // 契約状態をチェック - 契約が無効な場合は計測をスキップ
    if (clinicId) {
      const canTrack = await canTrackSession(clinicId);
      if (!canTrack) {
        return NextResponse.json({ success: true, tracked: false });
      }
    }

    // CTAクリックを記録（sessionIdがあれば関連付け）
    await prisma.cTAClick.create({
      data: {
        clinicId,
        channelId,
        ctaType, // booking, phone, line, instagram
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track CTA click error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
