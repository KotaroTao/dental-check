import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";

// ベースURLを取得（環境変数優先、フォールバックはrequest.url）
function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl = getBaseUrl(request);

  try {
    // チャンネルを取得
    const channel = await prisma.channel.findUnique({
      where: { code },
    });

    if (!channel || !channel.isActive) {
      return NextResponse.redirect(`${baseUrl}/`);
    }

    // サブスクリプション状態をチェック
    const subscriptionCheck = await checkSubscription(channel.clinicId);
    if (!subscriptionCheck.isActive) {
      return NextResponse.redirect(`${baseUrl}/`);
    }

    // 有効期限チェック
    if (channel.expiresAt && new Date() > new Date(channel.expiresAt)) {
      // 期限切れの場合は期限切れページへ
      return NextResponse.redirect(`${baseUrl}/c/${code}/expired`);
    }

    // diagnosisタイプまたはlinkタイプの場合 → 共通プロファイル入力ページへ
    if (
      (channel.channelType === "diagnosis" && channel.diagnosisTypeSlug) ||
      (channel.channelType === "link" && channel.redirectUrl)
    ) {
      return NextResponse.redirect(`${baseUrl}/c/${code}/profile`);
    }

    // どちらでもない場合はトップへ
    return NextResponse.redirect(`${baseUrl}/`);
  } catch (error) {
    console.error("Channel redirect error:", error);
    return NextResponse.redirect(`${baseUrl}/`);
  }
}
