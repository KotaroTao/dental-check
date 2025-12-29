import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDiagnosisType } from "@/data/diagnosis-types";
import { DiagnosisFlow } from "@/components/diagnosis/diagnosis-flow";

interface Props {
  params: Promise<{ type: string }>;
}

async function getDiagnosis(slug: string) {
  // まずデータベースから取得を試みる
  try {
    const dbDiagnosis = await prisma.diagnosisType.findUnique({
      where: { slug, isActive: true },
    });

    if (dbDiagnosis) {
      // DBの診断データをDiagnosisFlow用の形式に変換
      const questions = dbDiagnosis.questions as Array<{
        id: string;
        text: string;
        options: Array<{ id: string; text: string; score: number }>;
      }>;
      const resultPatterns = dbDiagnosis.resultPatterns as Array<{
        id: string;
        minScore: number;
        maxScore: number;
        category: string;
        title: string;
        description: string;
        advice: string;
      }>;

      return {
        slug: dbDiagnosis.slug,
        name: dbDiagnosis.name,
        description: dbDiagnosis.description || "",
        questions: questions.map((q, index) => ({
          id: index + 1,
          text: q.text,
          choices: q.options.map((o) => ({
            text: o.text,
            score: o.score,
          })),
        })),
        resultPatterns: resultPatterns.map((p) => ({
          minScore: p.minScore,
          maxScore: p.maxScore,
          category: p.category,
          title: p.title,
          message: p.description || p.advice || "",
        })),
      };
    }
  } catch (error) {
    console.error("Failed to fetch diagnosis from DB:", error);
  }

  // DBになければハードコードされたデータを使用（フォールバック）
  return getDiagnosisType(slug);
}

export default async function DemoDiagnosisPage({ params }: Props) {
  const { type } = await params;
  const diagnosis = await getDiagnosis(type);

  if (!diagnosis) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <DiagnosisFlow diagnosis={diagnosis} isDemo={true} />
    </main>
  );
}

export async function generateStaticParams() {
  return [
    { type: "oral-age" },
    { type: "child-orthodontics" },
  ];
}

export const dynamic = "force-dynamic";
