import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reverseGeocode } from "@/lib/geocoding";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeLatitude, sanitizeLongitude } from "@/lib/track-validation";

/**
 * 診断セッションの位置情報を高精度データで更新
 * ブラウザのGeolocation APIから取得した位置情報を受け取る
 */
export async function POST(request: NextRequest) {
  // レート制限: 1つのIPから1分間に20回まで
  const rateLimitResponse = checkRateLimit(request, "track-update-location", 20, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { sessionId } = body;

    // A6: 緯度経度をサニタイズ
    const latitude = sanitizeLatitude(body.latitude);
    const longitude = sanitizeLongitude(body.longitude);

    if (!sessionId || latitude === null || longitude === null) {
      return NextResponse.json(
        { error: "sessionId, latitude, longitude are required" },
        { status: 400 }
      );
    }

    // セッションが存在するか確認
    const session = await prisma.diagnosisSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // 緯度経度から都道府県・市区町村を逆ジオコーディング
    let location: { country: string; region: string; city: string; town: string } | null = null;
    try {
      location = await reverseGeocode(latitude, longitude);
    } catch (e) {
      console.error("Reverse geocode failed:", e);
    }

    // 座標を小数点2桁に丸める（約1km精度、プライバシー保護）
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLng = Math.round(longitude * 100) / 100;

    // セッションの位置情報を更新
    await prisma.diagnosisSession.update({
      where: { id: sessionId },
      data: {
        latitude: roundedLat,
        longitude: roundedLng,
        region: location?.region || null,
        city: location?.city || null,
        town: location?.town || null,
        country: location?.country || "JP",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json({ success: false });
  }
}
