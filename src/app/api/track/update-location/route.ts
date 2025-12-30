import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reverseGeocode } from "@/lib/geocoding";

/**
 * 診断セッションの位置情報を高精度データで更新
 * ブラウザのGeolocation APIから取得した位置情報を受け取る
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, latitude, longitude } = body;

    if (!sessionId || latitude === undefined || longitude === undefined) {
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
    const location = await reverseGeocode(latitude, longitude);

    // 座標を小数点2桁に丸める（約1km精度、プライバシー保護）
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLng = Math.round(longitude * 100) / 100;

    // セッションの位置情報を更新
    // 丸めた座標を保存（町丁目レベルの精度）
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
