import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { oralAgeDiagnosis, childOrthodonticsDiagnosis } from "@/data/diagnosis-types";

// ハードコードの診断をDBにシードする
async function seedDefaultDiagnoses(): Promise<{ success: boolean; error?: string; created?: string[] }> {
  const defaultDiagnoses = [oralAgeDiagnosis, childOrthodonticsDiagnosis];
  const created: string[] = [];

  for (const diagnosis of defaultDiagnoses) {
    try {
      const existing = await prisma.diagnosisType.findUnique({
        where: { slug: diagnosis.slug },
      });

      if (!existing) {
        await prisma.diagnosisType.create({
          data: {
            slug: diagnosis.slug,
            name: diagnosis.name,
            description: diagnosis.description,
            questions: diagnosis.questions,
            resultPatterns: diagnosis.resultPatterns,
            isActive: true,
          },
        });
        created.push(diagnosis.slug);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Error seeding ${diagnosis.slug}: ${errorMessage}` };
    }
  }
  return { success: true, created };
}

// 診断一覧取得
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 初回アクセス時にデフォルトの診断をシード
    const seedResult = await seedDefaultDiagnoses();

    const diagnoses = await prisma.diagnosisType.findMany({
      orderBy: { createdAt: "desc" },
    });

    // デバッグ用：シーディング結果を含める
    return NextResponse.json({ diagnoses, _debug: { seedResult } });
  } catch (error) {
    console.error("Failed to fetch diagnoses:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "診断の取得に失敗しました", _debug: { errorMessage } },
      { status: 500 }
    );
  }
}

// 新規診断作成
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, name, description, questions, resultPatterns, isActive } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "スラッグと名前は必須です" },
        { status: 400 }
      );
    }

    // スラッグの重複チェック
    const existing = await prisma.diagnosisType.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "このスラッグは既に使用されています" },
        { status: 400 }
      );
    }

    const diagnosis = await prisma.diagnosisType.create({
      data: {
        slug,
        name,
        description: description || null,
        questions: questions || [],
        resultPatterns: resultPatterns || [],
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ diagnosis }, { status: 201 });
  } catch (error) {
    console.error("Failed to create diagnosis:", error);
    return NextResponse.json(
      { error: "診断の作成に失敗しました" },
      { status: 500 }
    );
  }
}
