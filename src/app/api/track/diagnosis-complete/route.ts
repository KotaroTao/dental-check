import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 診断完了API
 * - sessionIdに紐づくセッションに診断結果を保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, answers, totalScore, resultCategory, oralAge } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // セッションを取得
    const session = await prisma.diagnosisSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        completedAt: true,
        sessionType: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // 既に完了している場合はスキップ
    if (session.completedAt) {
      return NextResponse.json({
        success: true,
        message: "Session already completed",
      });
    }

    // linkタイプのセッションは診断完了を受け付けない
    if (session.sessionType === "link") {
      return NextResponse.json(
        { error: "Cannot complete diagnosis for link session" },
        { status: 400 }
      );
    }

    // セッションを更新
    await prisma.diagnosisSession.update({
      where: { id: sessionId },
      data: {
        answers: answers || null,
        totalScore: totalScore || null,
        resultCategory: resultCategory || null,
        oralAge: oralAge || null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Diagnosis complete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
