import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 診断詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const diagnosis = await prisma.diagnosisType.findUnique({
      where: { id },
    });

    if (!diagnosis) {
      return NextResponse.json(
        { error: "診断が見つかりません" },
        { status: 404 }
      );
    }

    // クリニックがアクセス可能か確認
    // システム診断（clinicId = null）または自分のクリニックの診断のみ
    if (diagnosis.clinicId !== null && diagnosis.clinicId !== session.clinicId) {
      return NextResponse.json(
        { error: "この診断にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    return NextResponse.json({ diagnosis });
  } catch (error) {
    console.error("Failed to fetch diagnosis:", error);
    return NextResponse.json(
      { error: "診断の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 診断更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 診断を取得して権限確認
    const existingDiagnosis = await prisma.diagnosisType.findUnique({
      where: { id },
    });

    if (!existingDiagnosis) {
      return NextResponse.json(
        { error: "診断が見つかりません" },
        { status: 404 }
      );
    }

    // 自分のクリニックの診断のみ編集可能（システム診断は編集不可）
    if (existingDiagnosis.clinicId !== session.clinicId) {
      return NextResponse.json(
        { error: "この診断を編集する権限がありません" },
        { status: 403 }
      );
    }

    // 契約状態を確認
    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (!subscriptionState.canCreateCustomDiagnosis) {
      return NextResponse.json(
        { error: "診断を編集するには、カスタムプラン以上のご契約が必要です。" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { slug, name, description, questions, resultPatterns, isActive } = body;

    // スラッグの重複チェック（自身を除く）
    if (slug && slug !== existingDiagnosis.slug) {
      const slugExists = await prisma.diagnosisType.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています" },
          { status: 400 }
        );
      }
    }

    const oldSlug = existingDiagnosis.slug;
    const newSlug = slug || oldSlug;

    const diagnosis = await prisma.diagnosisType.update({
      where: { id },
      data: {
        ...(slug && { slug }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(questions !== undefined && { questions }),
        ...(resultPatterns !== undefined && { resultPatterns }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // スラッグが変更された場合、関連するチャンネルも更新
    if (slug && slug !== oldSlug) {
      await prisma.channel.updateMany({
        where: {
          clinicId: session.clinicId,
          diagnosisTypeSlug: oldSlug,
        },
        data: {
          diagnosisTypeSlug: newSlug,
        },
      });
    }

    return NextResponse.json({ diagnosis });
  } catch (error) {
    console.error("Failed to update diagnosis:", error);
    return NextResponse.json(
      { error: "診断の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// 診断削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 診断を取得して権限確認
    const diagnosis = await prisma.diagnosisType.findUnique({
      where: { id },
    });

    if (!diagnosis) {
      return NextResponse.json(
        { error: "診断が見つかりません" },
        { status: 404 }
      );
    }

    // 自分のクリニックの診断のみ削除可能（システム診断は削除不可）
    if (diagnosis.clinicId !== session.clinicId) {
      return NextResponse.json(
        { error: "この診断を削除する権限がありません" },
        { status: 403 }
      );
    }

    await prisma.diagnosisType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete diagnosis:", error);
    return NextResponse.json(
      { error: "診断の削除に失敗しました" },
      { status: 500 }
    );
  }
}
