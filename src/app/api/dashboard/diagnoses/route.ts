import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";
import { diagnosisTypes } from "@/data/diagnosis-types";

// 静的に定義されたデフォルト診断をDB形式に変換
function getStaticDiagnoses() {
  return Object.values(diagnosisTypes).map((d) => ({
    id: `static-${d.slug}`,
    slug: d.slug,
    clinicId: null,
    name: d.name,
    description: d.description,
    isActive: true,
    createdAt: new Date().toISOString(),
  }));
}

// クリニックの診断一覧を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // データベースから診断を取得
    let dbDiagnoses: Array<{
      id: string;
      slug: string;
      clinicId: string | null;
      name: string;
      description: string | null;
      isActive: boolean;
      createdAt: Date | string;
    }> = [];

    try {
      dbDiagnoses = await prisma.diagnosisType.findMany({
        where: {
          OR: [
            { clinicId: null, isActive: true }, // システム診断はisActive: trueのみ
            { clinicId: session.clinicId }, // オリジナル診断はisActiveに関係なくすべて取得
          ],
        },
        orderBy: [
          { clinicId: "asc" },
          { createdAt: "desc" },
        ],
      });
    } catch (dbError) {
      console.warn("clinicId query failed, falling back to simple query:", dbError);
      const fallbackDiagnoses = await prisma.diagnosisType.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      dbDiagnoses = fallbackDiagnoses.map((d: Record<string, unknown>) => ({
        ...d,
        clinicId: null,
      })) as typeof dbDiagnoses;
    }

    // 静的診断を取得
    const staticDiagnoses = getStaticDiagnoses();

    // DBに存在するスラッグを取得
    const dbSlugs = new Set(dbDiagnoses.map((d) => d.slug));

    // DBに存在しない静的診断を追加
    const missingStaticDiagnoses = staticDiagnoses.filter(
      (d) => !dbSlugs.has(d.slug)
    );

    // 結合して返す（システム診断を先に、その後カスタム診断）
    const allDiagnoses = [...missingStaticDiagnoses, ...dbDiagnoses];

    // システム診断（clinicId = null）を先に、オリジナル診断を後に
    const sortedDiagnoses = allDiagnoses.sort((a, b) => {
      if (a.clinicId === null && b.clinicId !== null) return -1;
      if (a.clinicId !== null && b.clinicId === null) return 1;
      return 0;
    });

    // 契約状態を取得してオリジナル診断作成可能か確認
    const subscriptionState = await getSubscriptionState(session.clinicId);

    return NextResponse.json({
      diagnoses: sortedDiagnoses,
      canCreateCustomDiagnosis: subscriptionState.canCreateCustomDiagnosis,
    });
  } catch (error) {
    console.error("Failed to fetch diagnoses:", error);
    return NextResponse.json(
      { error: "診断の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 新規診断作成（オリジナル診断）
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 契約状態を確認
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (!subscriptionState.canCreateCustomDiagnosis) {
      return NextResponse.json(
        { error: "オリジナル診断を作成するには、カスタムプラン以上のご契約が必要です。" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { slug, name, description, questions, resultPatterns } = body;

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
        clinicId: session.clinicId, // クリニック固有の診断
        name,
        description: description || null,
        questions: questions || [],
        resultPatterns: resultPatterns || [],
        isActive: true,
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
