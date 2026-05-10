import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSubscription, canTrackSession } from "@/lib/subscription";
import { getClientIP } from "@/lib/geolocation";

// ベースURLを取得（環境変数優先、フォールバックはrequest.url）
function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

// bot/プリフェッチ判定（簡易版）
// → スキャンしていない裏のリクエストを反応率にカウントしないためのフィルタ
function isBotOrPrefetch(request: NextRequest): boolean {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true; // UA無しは安全側でbot扱い
  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "slurp",
    "preview",
    "fetch",
    "monitor",
    "pingdom",
    "sentry",
    "headlesschrome",
    "lighthouse",
    "embedly",
  ];
  if (botPatterns.some((p) => ua.includes(p))) return true;

  // ブラウザのリンクプリフェッチ系ヘッダ
  const purpose = (
    request.headers.get("purpose") ||
    request.headers.get("sec-purpose") ||
    request.headers.get("x-purpose") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return true;

  return false;
}

// QRスキャン1件を記録（失敗してもリダイレクトは妨げない）
async function recordQrScan(
  request: NextRequest,
  channelId: string,
  clinicId: string
): Promise<void> {
  try {
    const ip = getClientIP(request);
    await prisma.accessLog.create({
      data: {
        clinicId,
        channelId,
        eventType: "qr_scan",
        userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
        referer: request.headers.get("referer")?.slice(0, 500) || null,
        ipAddress: ip !== "unknown" ? ip : null,
        // 位置情報（country/region/city）は後段の page_view 側で記録される
        // QRスキャン時は外部API呼び出しを避けてリダイレクトを高速化
      },
    });
  } catch (error) {
    // トラッキング失敗はユーザー体験を絶対に壊さない
    console.error("QR scan tracking error:", error);
  }
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

    // ★ QRスキャンを記録（bot/プリフェッチは除外、契約状態が計測可能な場合のみ）
    // diagnosis/link 両方のタイプで「スキャンされた瞬間」をここで1件カウントする
    // → これまでは診断ページ到達時にしかカウントされず、プロフィール入力前で
    //   離脱したユーザーが分母に入っていなかった（反応率が実態より低く出ていた）
    // canTrackSession は checkSubscription より厳しく、grace_period では false を返す。
    // ユーザーの遷移自体は止めず（リダイレクトは継続）、AccessLog のみスキップする。
    if (!isBotOrPrefetch(request)) {
      const canTrack = await canTrackSession(channel.clinicId);
      if (canTrack) {
        await recordQrScan(request, channel.id, channel.clinicId);
      }
    }

    // diagnosisタイプの場合 → プロファイル入力ページへ
    if (channel.channelType === "diagnosis" && channel.diagnosisTypeSlug) {
      return NextResponse.redirect(`${baseUrl}/c/${code}/profile`);
    }

    // linkタイプの場合 → プロファイル入力ページへ
    if (channel.channelType === "link" && channel.redirectUrl) {
      return NextResponse.redirect(`${baseUrl}/c/${code}/link`);
    }

    // どちらでもない場合はトップへ
    return NextResponse.redirect(`${baseUrl}/`);
  } catch (error) {
    console.error("Channel redirect error:", error);
    return NextResponse.redirect(`${baseUrl}/`);
  }
}
