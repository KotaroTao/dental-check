import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, ctaType } = body;

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

    // CTAクリックを記録
    await prisma.cTAClick.create({
      data: {
        clinicId,
        channelId,
        ctaType, // booking, phone, line, instagram
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track CTA click error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
