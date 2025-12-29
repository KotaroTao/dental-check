import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";

// クリニックの診断一覧を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クリニックが利用可能な診断を取得
    // 1. システム提供の診断（clinicId = null）
    // 2. 自分のクリニックの診断
    const diagnoses = await prisma.diagnosisType.findMany({
      where: {
        OR: [
          { clinicId: null },
          { clinicId: session.clinicId },
        ],
        isActive: true,
      },
      orderBy: [
        { clinicId: "asc" }, // システム診断を先に
        { createdAt: "desc" },
      ],
    });

    // 契約状態を取得してオリジナル診断作成可能か確認
    const subscriptionState = await getSubscriptionState(session.clinicId);

    return NextResponse.json({
      diagnoses,
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
