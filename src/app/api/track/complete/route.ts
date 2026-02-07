import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/geolocation";
import { canTrackSession } from "@/lib/subscription";
import { reverseGeocode } from "@/lib/geocoding";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // レート制限: 1つのIPから1分間に20回まで
  const rateLimitResponse = checkRateLimit(request, "track-complete", 20, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

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

