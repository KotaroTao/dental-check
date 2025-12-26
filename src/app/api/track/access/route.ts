import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, diagnosisType, eventType } = body;

    // アクセスログを記録
    await prisma.accessLog.create({
      data: {
        channelId: channelId || null,
        diagnosisTypeSlug: diagnosisType || null,
        eventType: eventType || "page_view",
        userAgent: request.headers.get("user-agent") || null,
        referer: request.headers.get("referer") || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track access error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
