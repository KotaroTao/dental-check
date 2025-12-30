import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/geolocation";
import { canTrackSession } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      channelId,
      diagnosisType,
      userAge,
      userGender,
      answers,
      totalScore,
      resultCategory,
      latitude,
      longitude,
    } = body;

    if (!channelId || !diagnosisType) {
      return NextResponse.json(
        { error: "channelId and diagnosisType are required" },
        { status: 400 }
      );
    }

    // チャンネルから医院IDと診断タイプIDを取得
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { clinicId: true },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // 契約状態をチェック - 契約が無効な場合は計測をスキップ
    const canTrack = await canTrackSession(channel.clinicId);
    if (!canTrack) {
      // 診断自体は成功として返す（ユーザー体験を損なわないため）
      // ただし計測データは保存しない
      return NextResponse.json({ success: true, sessionId: null, tracked: false });
    }

    // 診断タイプを取得
    const diagnosisTypeRecord = await prisma.diagnosisType.findUnique({
      where: { slug: diagnosisType },
      select: { id: true },
    });

    if (!diagnosisTypeRecord) {
      return NextResponse.json(
        { error: "DiagnosisType not found" },
        { status: 404 }
      );
    }

    // IPアドレスを取得（参考用に保存）
    const ip = getClientIP(request);

    // 位置情報の逆ジオコーディング
    let location: { country: string; region: string; city: string; town: string } | null = null;
    let roundedLat: number | null = null;
    let roundedLng: number | null = null;

    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      location = await reverseGeocode(latitude, longitude);
      // 座標を小数点2桁に丸める（約1km精度、プライバシー保護）
      roundedLat = Math.round(latitude * 100) / 100;
      roundedLng = Math.round(longitude * 100) / 100;
    }

    // 診断セッションを作成
    const session = await prisma.diagnosisSession.create({
      data: {
        clinicId: channel.clinicId,
        channelId,
        diagnosisTypeId: diagnosisTypeRecord.id,
        isDemo: false,
        userAge: userAge || null,
        userGender: userGender || null,
        answers: answers || null,
        totalScore: totalScore || null,
        resultCategory: resultCategory || null,
        completedAt: new Date(),
        ipAddress: ip !== "unknown" ? ip : null,
        latitude: roundedLat,
        longitude: roundedLng,
        country: location?.country || null,
        region: location?.region || null,
        city: location?.city || null,
        town: location?.town || null,
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("Track complete error:", error);
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
  town: string;
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

    // 町丁目を取得（フォールバック付き）
    const town = address.neighbourhood || address.quarter || address.suburb || "";

    return {
      country: address.country_code?.toUpperCase() || "JP",
      region,
      city,
      town,
    };
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}
