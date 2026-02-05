import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 履歴を論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "diagnosis" | "qr_scan"

    if (!type || !["diagnosis", "qr_scan", "link"].includes(type)) {
      return NextResponse.json(
        { error: "タイプの指定が不正です" },
        { status: 400 }
      );
    }

    if (type === "qr_scan") {
      // AccessLog の削除
      const accessLog = await prisma.accessLog.findFirst({
        where: {
          id,
          clinicId: session.clinicId,
        },
      });

      if (!accessLog) {
        return NextResponse.json(
          { error: "履歴が見つかりません" },
          { status: 404 }
        );
      }

      await prisma.accessLog.update({
        where: { id },
        data: { isDeleted: true },
      });
    } else {
      // DiagnosisSession の削除（diagnosis / link タイプ）
      const diagnosisSession = await prisma.diagnosisSession.findFirst({
        where: {
          id,
          clinicId: session.clinicId,
        },
      });

      if (!diagnosisSession) {
        return NextResponse.json(
          { error: "履歴が見つかりません" },
          { status: 404 }
        );
      }

      await prisma.diagnosisSession.update({
        where: { id },
        data: { isDeleted: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json(
      { error: "履歴の削除に失敗しました" },
      { status: 500 }
    );
  }
}
