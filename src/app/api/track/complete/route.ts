import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP, getLocationFromIP } from "@/lib/geolocation";
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

    // IPアドレスから位置情報を取得
    const ip = getClientIP(request);
    const location = await getLocationFromIP(ip);

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
        // 位置情報
        ipAddress: ip !== "unknown" ? ip : null,
        country: location?.countryCode || null,
        region: location?.regionName || null,
        city: location?.city || null,
        latitude: location?.lat || null,
        longitude: location?.lon || null,
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("Track complete error:", error);
    return NextResponse.json({ success: false });
  }
}
