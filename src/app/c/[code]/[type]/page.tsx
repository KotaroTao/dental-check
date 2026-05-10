import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDiagnosisType } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import type { Channel, Clinic } from "@/types/clinic";
import { ExpiredPage } from "@/components/channel/expired-page";
import { getChannelPublicName } from "@/lib/channel-display";

// bot/プリフェッチ判定（c/[code]/route.ts と同じロジック）
// AccessLog の page_view が AdBlock 等で取りこぼされる問題を解決するため、
// サーバーサイドで直接記録する
function isBotOrPrefetchUA(headers: Headers): boolean {
  const ua = (headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true;
  const botPatterns = [
    "bot", "crawler", "spider", "slurp", "preview", "fetch",
    "monitor", "pingdom", "sentry", "headlesschrome", "lighthouse", "embedly",
  ];
  if (botPatterns.some((p) => ua.includes(p))) return true;
  const purpose = (
    headers.get("purpose") ||
    headers.get("sec-purpose") ||
    headers.get("x-purpose") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return true;
  return false;
}

// 診断ページ到達を AccessLog に記録（page_view イベント）
async function recordDiagnosisPageView(
  reqHeaders: Headers,
  channelId: string,
  clinicId: string,
  diagnosisTypeSlug: string
): Promise<void> {
  if (isBotOrPrefetchUA(reqHeaders)) return;
  try {
    await prisma.accessLog.create({
      data: {
        clinicId,
        channelId,
        diagnosisTypeSlug,
        eventType: "page_view",
        userAgent: reqHeaders.get("user-agent")?.slice(0, 500) || null,
        referer: reqHeaders.get("referer")?.slice(0, 500) || null,
      },
    });
  } catch (error) {
    // トラッキング失敗は診断体験を絶対に壊さない
    console.error("Diagnosis page view tracking error:", error);
  }
}

interface Props {
  params: Promise<{
    code: string;
    type: string;
  }>;
}

interface ChannelResult {
  channel: Channel;
  clinic: Clinic;
  isExpired: boolean;
}

async function getChannelAndClinic(code: string): Promise<ChannelResult | null> {
  // チャンネルを取得
  const channel = (await prisma.channel.findUnique({
    where: { code },
  })) as (Channel & { expiresAt: Date | null }) | null;

  if (!channel || !channel.isActive) {
    return null;
  }

  // 医院情報を取得
  const clinic = (await prisma.clinic.findUnique({
    where: { id: channel.clinicId },
  })) as Clinic | null;

  if (!clinic) {
    return null;
  }

  // サブスクリプション状態をチェック
  const subscriptionCheck = await checkSubscription(clinic.id);
  if (!subscriptionCheck.isActive) {
    return null;
  }

  // 有効期限チェック
  const isExpired = channel.expiresAt ? new Date() > new Date(channel.expiresAt) : false;

  return { channel, clinic, isExpired };
}

// 診断タイプをDBから取得（フォールバック: 静的データ）
async function getDiagnosis(slug: string) {
  // まずデータベースから取得を試みる
  try {
    const dbDiagnosis = await prisma.diagnosisType.findUnique({
      where: { slug, isActive: true },
    });

    if (dbDiagnosis) {
      // DBの診断データをDiagnosisFlow用の形式に変換
      // DBは options で保存、DiagnosisFlow は choices を期待
      const rawQuestions = dbDiagnosis.questions as Array<{
        id: number | string;
        text: string;
        imageUrl?: string | null;
        options?: Array<{ text: string; score: number }>;
        choices?: Array<{ text: string; score: number }>;
      }>;

      const questions = rawQuestions.map((q, index) => ({
        id: typeof q.id === 'number' ? q.id : index + 1,
        text: q.text,
        imageUrl: q.imageUrl || null,
        choices: q.choices || q.options || [],
      }));

      const rawResultPatterns = dbDiagnosis.resultPatterns as Array<{
        minScore: number;
        maxScore: number;
        category: string;
        title: string;
        message?: string;
        description?: string;
        advice?: string;
        ageModifier?: number;
      }>;

      const resultPatterns = rawResultPatterns.map((p) => ({
        minScore: p.minScore,
        maxScore: p.maxScore,
        category: p.category,
        title: p.title,
        message: p.message || p.description || p.advice || "",
        ageModifier: p.ageModifier,
      }));

      return {
        slug: dbDiagnosis.slug,
        name: dbDiagnosis.name,
        description: dbDiagnosis.description || "",
        questions,
        resultPatterns,
      };
    }
  } catch (error) {
    console.error("Failed to fetch diagnosis from DB:", error);
  }

  // DBになければハードコードされたデータを使用（フォールバック）
  return getDiagnosisType(slug);
}

export default async function ClinicDiagnosisPage({ params }: Props) {
  const { code, type } = await params;

  // 診断タイプを取得（DB優先、フォールバック: 静的データ）
  const diagnosis = await getDiagnosis(type);
  if (!diagnosis) {
    notFound();
  }

  // チャンネルと医院情報を取得
  const data = await getChannelAndClinic(code);
  if (!data) {
    notFound();
  }

  const { channel, clinic, isExpired } = data;

  // 有効期限切れの場合
  if (isExpired) {
    return <ExpiredPage clinicName={clinic.name} logoUrl={clinic.logoUrl} />;
  }

  // 診断ページ到達を記録（サーバーサイド・fire-and-forget）
  // → 以前は <script> タグでクライアント側fetchしていたが、AdBlockerや
  //   ブラウザのトラッキング防止機能で取りこぼしが多く、結果として
  //   完了率が母数を超えて表示されてしまう問題があった
  const reqHeaders = await headers();
  await recordDiagnosisPageView(reqHeaders, channel.id, clinic.id, type);

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: clinic.mainColor + "10" }}
    >
      {/* 医院ヘッダー */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {clinic.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.logoUrl}
                alt={clinic.name}
                className="h-8 w-auto"
              />
            )}
            <span className="font-medium text-gray-800">{clinic.name}</span>
          </div>
        </div>
      </header>

      {/* 診断フロー */}
      <DiagnosisFlow
        diagnosis={diagnosis}
        isDemo={false}
        ctaConfig={clinic.ctaConfig}
        clinicName={clinic.name}
        mainColor={clinic.mainColor}
        channelId={channel.id}
        channelDisplayName={getChannelPublicName(channel as Channel)}
      />
    </main>
  );
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
