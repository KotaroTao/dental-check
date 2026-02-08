import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP, getLocationFromIP } from "@/lib/geolocation";
import { canTrackSession } from "@/lib/subscription";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeEventType, sanitizeString } from "@/lib/track-validation";

export async function POST(request: NextRequest) {
  // レート制限: 1つのIPから1分間に60回まで
  const rateLimitResponse = checkRateLimit(request, "track-access", 60, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { channelId } = body;

    // A6: 入力値をサニタイズ
    const diagnosisType = sanitizeString(body.diagnosisType, 100);
    const eventType = sanitizeEventType(body.eventType);

    // チャンネルから医院IDを取得
    let clinicId: string | null = null;
    if (channelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { clinicId: true },
      });
      clinicId = channel?.clinicId || null;

      // 契約状態をチェック - 契約が無効な場合は計測をスキップ
      if (clinicId) {
        const canTrack = await canTrackSession(clinicId);
        if (!canTrack) {
          return NextResponse.json({ success: true, tracked: false });
        }
      }
    }

    // IPアドレスから位置情報を取得
    const ip = getClientIP(request);
    const location = await getLocationFromIP(ip);

    // アクセスログを記録
    await prisma.accessLog.create({
      data: {
        clinicId,
        channelId: channelId || null,
        diagnosisTypeSlug: diagnosisType,
        eventType,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
        referer: request.headers.get("referer")?.slice(0, 500) || null,
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
