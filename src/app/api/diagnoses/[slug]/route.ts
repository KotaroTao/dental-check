import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDiagnosisType } from "@/data/diagnosis-types";

interface RouteParams {
  params: { slug: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // まずデータベースから取得を試みる
    const dbDiagnosis = await prisma.diagnosisType.findUnique({
      where: { slug: params.slug, isActive: true },
    });

    if (dbDiagnosis) {
      return NextResponse.json({
        diagnosis: {
          slug: dbDiagnosis.slug,
          name: dbDiagnosis.name,
          description: dbDiagnosis.description,
          questions: dbDiagnosis.questions,
          resultPatterns: dbDiagnosis.resultPatterns,
        },
      });
    }

    // DBになければハードコードされたデータを使用（フォールバック）
    const hardcodedDiagnosis = getDiagnosisType(params.slug);

    if (hardcodedDiagnosis) {
      return NextResponse.json({
        diagnosis: hardcodedDiagnosis,
      });
    }

    return NextResponse.json(
      { error: "診断が見つかりません" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to fetch diagnosis:", error);
    return NextResponse.json(
      { error: "診断の取得に失敗しました" },
      { status: 500 }
    );
  }
}
