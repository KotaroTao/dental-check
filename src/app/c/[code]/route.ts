import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";

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

    // linkタイプの場合 → プロファイル入力ページへ
    if (channel.channelType === "link" && channel.redirectUrl) {
      return NextResponse.redirect(new URL(`/c/${code}/link`, request.url));
    }

    // どちらでもない場合はトップへ
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Channel redirect error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
