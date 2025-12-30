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

    // デバッグログ: 受信データ
    console.log("=== Track Complete Debug ===");
    console.log("Received body:", JSON.stringify(body, null, 2));
    console.log("channelId:", channelId);
    console.log("diagnosisType:", diagnosisType);
    console.log("userAge:", userAge);
    console.log("userGender:", userGender);
    console.log("latitude:", latitude);
    console.log("longitude:", longitude);
    console.log("answers count:", answers?.length);
    console.log("============================");

    if (!channelId || !diagnosisType) {
      console.log("Error: Missing required fields");
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

    console.log("=== Location Processing ===");
    console.log("Raw latitude:", latitude, "type:", typeof latitude);
    console.log("Raw longitude:", longitude, "type:", typeof longitude);

    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      console.log("GPS coordinates available, starting reverse geocode...");
      location = await reverseGeocode(latitude, longitude);
      console.log("Geocode result:", location);
      // 座標を小数点2桁に丸める（約1km精度、プライバシー保護）
      roundedLat = Math.round(latitude * 100) / 100;
      roundedLng = Math.round(longitude * 100) / 100;
    } else {
      console.log("No GPS coordinates provided - skipping geocode");
    }
    console.log("=== Location Processing End ===")

    // 診断セッションを作成
    console.log("Creating session with data:", {
      clinicId: channel.clinicId,
      channelId,
      diagnosisTypeId: diagnosisTypeRecord.id,
      userAge: userAge || null,
      userGender: userGender || null,
      latitude: roundedLat,
      longitude: roundedLng,
      country: location?.country || null,
      region: location?.region || null,
      city: location?.city || null,
    });

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

    console.log("Session created successfully:", session.id);
    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("Track complete error:", error);
    return NextResponse.json({ success: false });
  }
}

/**
 * 緯度経度から住所情報を取得（逆ジオコーディング）
 * タイムアウトとリトライ機能付き
 */
async function reverseGeocode(lat: number, lon: number): Promise<{
  country: string;
  region: string;
  city: string;
  town: string;
} | null> {
  console.log(`=== Reverse Geocode ===`);
  console.log(`Input: lat=${lat}, lon=${lon}`);

  const maxRetries = 3;
  const timeoutMs = 10000; // 10秒タイムアウト

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // OpenStreetMap Nominatim API（無料、1リクエスト/秒制限）
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`;
      console.log(`Nominatim attempt ${attempt}/${maxRetries}: ${url}`);

      // AbortControllerでタイムアウトを実装
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: {
          // Nominatim Usage Policy要件: アプリ名、URL、連絡先を含むUser-Agent
          "User-Agent": "DentalCheckApp/1.0 (https://qrqr-dental.com; mail@function-t.com)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Nominatim response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Nominatim API error: status=${response.status}, body=${errorText}`);
        // 429 (Too Many Requests) の場合はリトライ
        if (response.status === 429 && attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2秒, 4秒, 6秒
          console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        return null;
      }

      const data = await response.json();
      console.log(`Nominatim response:`, JSON.stringify(data.address || {}, null, 2));

      const address = data.address;

      if (!address) {
        console.warn("Nominatim returned no address data");
        return null;
      }

      // 都道府県を取得（state または province）
      const region = address.state || address.province || "";

      // 市区町村を取得（city, town, village, municipality のいずれか）
      const city = address.city || address.town || address.village || address.municipality || "";

      // 町丁目を取得（フォールバック付き）
      const town = address.neighbourhood || address.quarter || address.suburb || "";

      const result = {
        country: address.country_code?.toUpperCase() || "JP",
        region,
        city,
        town,
      };

      console.log(`Geocode result:`, result);
      return result;
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof Error && error.message.includes("fetch failed");

      console.error(`Reverse geocode error (attempt ${attempt}/${maxRetries}):`,
        isTimeout ? "Request timed out" : error);

      // タイムアウトまたはネットワークエラーの場合はリトライ
      if ((isTimeout || isNetworkError) && attempt < maxRetries) {
        const waitTime = attempt * 1000; // 1秒, 2秒, 3秒
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return null;
    }
  }

  console.error("All geocode attempts failed");
  return null;
}
