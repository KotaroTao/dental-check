import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import { getClientIP, getLocationFromIP } from "@/lib/geolocation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    // チャンネルを取得
    const channel = await prisma.channel.findUnique({
      where: { code },
    });

    if (!channel || !channel.isActive) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // サブスクリプション状態をチェック
    const subscriptionCheck = await checkSubscription(channel.clinicId);
    if (!subscriptionCheck.isActive) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 有効期限チェック
    if (channel.expiresAt && new Date() > new Date(channel.expiresAt)) {
      // 期限切れの場合は期限切れページへ
      return NextResponse.redirect(new URL(`/c/${code}/expired`, request.url));
    }

    // diagnosisタイプの場合は従来のルートへリダイレクト
    if (channel.channelType === "diagnosis" && channel.diagnosisTypeSlug) {
      return NextResponse.redirect(
        new URL(`/c/${code}/${channel.diagnosisTypeSlug}`, request.url)
      );
    }

    // linkタイプの場合
    if (channel.channelType === "link" && channel.redirectUrl) {
      // スキャン回数をインクリメント（非同期で並行実行）
      const updatePromise = prisma.channel.update({
        where: { id: channel.id },
        data: { scanCount: { increment: 1 } },
      });

      // AccessLogに記録（位置情報付き）
      const ip = getClientIP(request);
      const location = await getLocationFromIP(ip);

      const accessLogPromise = prisma.accessLog.create({
        data: {
          clinicId: channel.clinicId,
          channelId: channel.id,
          eventType: "qr_scan",
          userAgent: request.headers.get("user-agent") || null,
          referer: request.headers.get("referer") || null,
          ipAddress: ip !== "unknown" ? ip : null,
          country: location?.countryCode || null,
          region: location?.regionName || null,
          city: location?.city || null,
        },
      });

      // 両方の処理を並行実行（エラーは無視してリダイレクトを優先）
      await Promise.allSettled([updatePromise, accessLogPromise]);

      // リダイレクト先URLへ
      return NextResponse.redirect(channel.redirectUrl);
    }

    // どちらでもない場合はトップへ
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Channel redirect error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
