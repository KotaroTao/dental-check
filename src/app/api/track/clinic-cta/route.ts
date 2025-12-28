import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicId, ctaType } = body;

    if (!clinicId || !ctaType) {
      return NextResponse.json(
        { error: "clinicId and ctaType are required" },
        { status: 400 }
      );
    }

    // CTAクリックを記録（医院紹介ページからのクリック）
    await prisma.cTAClick.create({
      data: {
        clinicId,
        channelId: null, // 医院紹介ページからのクリックなのでchannelIdはnull
        ctaType, // booking, phone, line, instagram, youtube, facebook, tiktok, threads
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track clinic CTA click error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
