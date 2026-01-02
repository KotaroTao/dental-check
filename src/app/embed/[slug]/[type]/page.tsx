import { notFound } from "next/navigation";
import { getDiagnosisType } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";
import { prisma } from "@/lib/prisma";
import { checkSubscription } from "@/lib/subscription";
import type { Clinic } from "@/types/clinic";
import type { Metadata } from "next";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, type } = await params;
  const diagnosis = await getDiagnosis(type);
  const clinic = await getClinic(slug);

  return {
    title: diagnosis && clinic ? `${diagnosis.name} - ${clinic.name}` : "診断ツール",
    robots: "noindex, nofollow",
  };
}

export default async function EmbedDiagnosisPage({ params }: Props) {
  const { slug, type } = await params;

  // 診断タイプを取得（DB優先、フォールバック: 静的データ）
  const diagnosis = await getDiagnosis(type);
  if (!diagnosis) {
    notFound();
  }

  // 医院情報を取得
  const clinic = await getClinic(slug);
  if (!clinic) {
    notFound();
  }

  return (
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
        ctaConfig={clinic.ctaConfig}
        clinicName={clinic.name}
        mainColor={clinic.mainColor}
      />

      {/* 埋め込みトラッキング */}
      <EmbedTracker clinicSlug={slug} diagnosisType={type} />
    </main>
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
  // XSS対策: JSON.stringifyでエスケープ
  const safeClinicSlug = JSON.stringify(clinicSlug);
  const safeDiagnosisType = JSON.stringify(diagnosisType);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          fetch('/api/track/access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clinicSlug: ${safeClinicSlug},
              diagnosisType: ${safeDiagnosisType},
              eventType: 'embed_view'
            })
          }).catch(function() {});
        `,
      }}
    />
  );
}

// 静的生成を無効化（動的ルート）
export const dynamic = "force-dynamic";
