import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/geolocation";
import { canTrackSession } from "@/lib/subscription";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sanitizeAge,
  sanitizeGender,
  sanitizeLatitude,
  sanitizeLongitude,
} from "@/lib/track-validation";

/**
 * リンクタイプQRコードのセッション完了を記録
 * プロファイル情報と位置情報を取得してセッションを作成
 */
export async function POST(request: NextRequest) {
  // レート制限: 1つのIPから1分間に20回まで
  const rateLimitResponse = checkRateLimit(request, "track-link-complete", 20, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 }
      );
    }

    // A6: 入力値をサニタイズ
    const userAge = sanitizeAge(body.userAge);
    const userGender = sanitizeGender(body.userGender);
    const latitude = sanitizeLatitude(body.latitude);
    const longitude = sanitizeLongitude(body.longitude);

    // チャンネル情報を取得
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        clinicId: true,
        channelType: true,
        redirectUrl: true,
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // linkタイプでない場合はエラー
    if (channel.channelType !== "link" || !channel.redirectUrl) {
      return NextResponse.json(
        { error: "Channel is not a link type" },
        { status: 400 }
      );
    }

    // 契約状態をチェック
    const canTrack = await canTrackSession(channel.clinicId);

    // IPアドレスを取得
    const ip = getClientIP(request);

    // 位置情報の逆ジオコーディング（緯度経度が両方有効な場合のみ）
    let location: { country: string; region: string; city: string; town: string } | null = null;
    let roundedLat: number | null = null;
    let roundedLng: number | null = null;

    if (latitude !== null && longitude !== null) {
      try {
        location = await reverseGeocode(latitude, longitude);
      } catch (e) {
        console.error("Reverse geocode failed:", e);
      }
      // 座標を小数点2桁に丸める（約1km精度、プライバシー保護）
      roundedLat = Math.round(latitude * 100) / 100;
      roundedLng = Math.round(longitude * 100) / 100;
    }

    // セッションを作成（契約が有効な場合のみ）
    let sessionId: string | null = null;

    if (canTrack) {
      const session = await prisma.diagnosisSession.create({
        data: {
          clinicId: channel.clinicId,
          channelId: channel.id,
          diagnosisTypeId: null, // linkタイプは診断なし
          sessionType: "link",
          isDemo: false,
          userAge,
          userGender,
          answers: null,
          totalScore: null,
          resultCategory: null,
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
      sessionId = session.id;

      // 直リンクのCTAクリックを記録
      await prisma.cTAClick.create({
        data: {
          clinicId: channel.clinicId,
          channelId: channel.id,
          ctaType: "direct_link",
          sessionId: session.id,
        },
      });

      // スキャン回数をインクリメント
      await prisma.channel.update({
        where: { id: channel.id },
        data: { scanCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      redirectUrl: channel.redirectUrl,
      tracked: canTrack,
    });
  } catch (error) {
    console.error("Link complete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
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
