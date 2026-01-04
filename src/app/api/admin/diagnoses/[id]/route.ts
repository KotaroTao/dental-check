import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

// 診断詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { slug, name, description, questions, resultPatterns, isActive } = body;

    // スラッグの重複チェック（自身を除く）
    if (slug) {
      const existing = await prisma.diagnosisType.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています" },
          { status: 400 }
        );
      }
    }

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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
