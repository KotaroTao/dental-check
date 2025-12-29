import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // セッションの位置情報を更新
    await prisma.diagnosisSession.update({
      where: { id: sessionId },
      data: {
        latitude,
        longitude,
        region: location?.region || null,
        city: location?.city || null,
        country: location?.country || "JP",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json({ success: false });
  }
}

/**
 * 緯度経度から住所情報を取得（逆ジオコーディング）
 */
async function reverseGeocode(lat: number, lon: number): Promise<{
  country: string;
  region: string;
  city: string;
} | null> {
  try {
    // OpenStreetMap Nominatim API（無料、1リクエスト/秒制限）
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`,
      {
        headers: {
          "User-Agent": "DentalCheckApp/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error("Nominatim API error:", response.status);
      return null;
    }

    const data = await response.json();
    const address = data.address;

    if (!address) {
      return null;
    }

    // 都道府県を取得（state または province）
    const region = address.state || address.province || "";

    // 市区町村を取得（city, town, village, municipality のいずれか）
    const city = address.city || address.town || address.village || address.municipality || "";

    return {
      country: address.country_code?.toUpperCase() || "JP",
      region,
      city,
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}
