import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, ctaType, diagnosisType } = body;

    if (!channelId || !ctaType) {
      return NextResponse.json(
        { error: "channelId and ctaType are required" },
        { status: 400 }
      );
    }

    // CTAクリックを記録
    await prisma.ctaClick.create({
      data: {
        channelId,
        ctaType, // booking, phone, line, instagram
        diagnosisTypeSlug: diagnosisType || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track CTA click error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
