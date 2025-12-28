import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP, getLocationFromIP } from "@/lib/geolocation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, diagnosisType, eventType } = body;

    // チャンネルから医院IDを取得
    let clinicId: string | null = null;
    if (channelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { clinicId: true },
      });
      clinicId = channel?.clinicId || null;
    }

    // IPアドレスから位置情報を取得
    const ip = getClientIP(request);
    const location = await getLocationFromIP(ip);

    // アクセスログを記録
    await prisma.accessLog.create({
      data: {
        clinicId,
        channelId: channelId || null,
        diagnosisTypeSlug: diagnosisType || null,
        eventType: eventType || "page_view",
        userAgent: request.headers.get("user-agent") || null,
        referer: request.headers.get("referer") || null,
        // 位置情報
        ipAddress: ip !== "unknown" ? ip : null,
        country: location?.countryCode || null,
        region: location?.regionName || null,
        city: location?.city || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track access error:", error);
    // トラッキングエラーは静かに失敗させる
    return NextResponse.json({ success: false });
  }
}
