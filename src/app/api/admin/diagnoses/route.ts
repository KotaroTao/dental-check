import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { oralAgeDiagnosis, childOrthodonticsDiagnosis } from "@/data/diagnosis-types";

// ハードコードの診断をDBにシードする
async function seedDefaultDiagnoses() {
  const defaultDiagnoses = [oralAgeDiagnosis, childOrthodonticsDiagnosis];

  for (const diagnosis of defaultDiagnoses) {
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
    }
  }
}

// 診断一覧取得
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 初回アクセス時にデフォルトの診断をシード
    await seedDefaultDiagnoses();

    const diagnoses = await prisma.diagnosisType.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ diagnoses });
  } catch (error) {
    console.error("Failed to fetch diagnoses:", error);
    return NextResponse.json(
      { error: "診断の取得に失敗しました" },
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
