import { notFound } from "next/navigation";
import { diagnosisTypes } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import type { Clinic } from "@/types/clinic";

interface Props {
  params: Promise<{
    slug: string;
    type: string;
  }>;
}

async function getClinic(slug: string) {
  const clinic = (await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      mainColor: true,
      ctaConfig: true,
    },
  })) as Pick<Clinic, "id" | "slug" | "name" | "logoUrl" | "mainColor" | "ctaConfig"> | null;

  if (!clinic) {
    return null;
  }

  // サブスクリプション状態をチェック
  const subscriptionCheck = await checkSubscription(clinic.id);
  if (!subscriptionCheck.isActive) {
    return null;
  }

  return clinic;
}

export default async function EmbedDiagnosisPage({ params }: Props) {
  const { slug, type } = await params;

  // 診断タイプを取得
  const diagnosis = diagnosisTypes[type];
  if (!diagnosis) {
    notFound();
  }

  // 医院情報を取得
  const clinic = await getClinic(slug);
  if (!clinic) {
    notFound();
  }

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{diagnosis.name} - {clinic.name}</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: transparent;
              min-height: 100vh;
            }
          `
        }} />
      </head>
      <body>
        <main
          className="min-h-screen"
          style={{ backgroundColor: clinic.mainColor + "10" }}
        >
          {/* 医院ヘッダー（コンパクト版） */}
          <header className="bg-white border-b">
            <div className="px-4 py-2">
              <div className="flex items-center justify-center gap-2">
                {clinic.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clinic.logoUrl}
                    alt={clinic.name}
                    className="h-6 w-auto"
                  />
                )}
                <span className="font-medium text-gray-800 text-sm">{clinic.name}</span>
              </div>
            </div>
          </header>

          {/* 診断フロー */}
          <DiagnosisFlow
            diagnosis={diagnosis}
            isDemo={false}
            clinicSlug={clinic.slug}
            ctaConfig={clinic.ctaConfig}
            clinicName={clinic.name}
            mainColor={clinic.mainColor}
          />

          {/* 埋め込みトラッキング */}
          <EmbedTracker clinicSlug={slug} diagnosisType={type} />
        </main>
      </body>
    </html>
  );
}

// 埋め込みトラッキングコンポーネント
function EmbedTracker({
  clinicSlug,
  diagnosisType,
}: {
  clinicSlug: string;
  diagnosisType: string;
}) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          fetch('/api/track/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clinicSlug: '${clinicSlug}',
              diagnosisType: '${diagnosisType}',
              eventType: 'embed_view'
            })
          }).catch(() => {});
        `,
      }}
    />
  );
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
