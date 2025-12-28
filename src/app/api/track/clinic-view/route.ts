import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicId } = body;

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 }
      );
    }

    // 医院紹介ページの閲覧を記録
    await prisma.accessLog.create({
      data: {
        clinicId,
        eventType: "clinic_page_view",
        userAgent: request.headers.get("user-agent") || null,
        referer: request.headers.get("referer") || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track clinic page view error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
