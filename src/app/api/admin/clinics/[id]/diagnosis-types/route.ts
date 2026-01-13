import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// 指定医院の診断タイプ設定を取得（管理者用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: clinicId } = await params;

    // 医院の存在確認
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    // システム診断タイプを取得
    const systemDiagnosisTypes = await prisma.diagnosisType.findMany({
      where: { clinicId: null, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // クリニック固有の診断タイプを取得
    const clinicDiagnosisTypes = await prisma.diagnosisType.findMany({
      where: { clinicId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // クリニックの診断設定を取得
    const clinicDiagnoses = await prisma.clinicDiagnosis.findMany({
      where: { clinicId },
      select: {
        diagnosisTypeId: true,
        isEnabled: true,
      },
    });

    type ClinicDiagnosisItem = { diagnosisTypeId: string; isEnabled: boolean };
    const enabledDiagnosisIds = new Set(
      clinicDiagnoses.filter((cd: ClinicDiagnosisItem) => cd.isEnabled).map((cd: ClinicDiagnosisItem) => cd.diagnosisTypeId)
    );

    // システム診断タイプに有効フラグを追加
    type SystemDiagnosisTypeItem = { id: string; slug: string; name: string; description: string | null };
    const systemTypesWithEnabled = systemDiagnosisTypes.map((dt: SystemDiagnosisTypeItem) => ({
      ...dt,
      isEnabled: enabledDiagnosisIds.has(dt.id),
      isSystem: true,
    }));

    return NextResponse.json({
      clinicName: clinic.name,
      systemDiagnosisTypes: systemTypesWithEnabled,
      clinicDiagnosisTypes,
    });
  } catch (error) {
    console.error("Admin clinic diagnosis types error:", error);
    return NextResponse.json(
      { error: "診断タイプの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 診断タイプの有効/無効を切り替え（管理者用）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: clinicId } = await params;

    // 医院の存在確認
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const { diagnosisTypeId, isEnabled } = body;

    if (!diagnosisTypeId) {
      return NextResponse.json({ error: "診断タイプIDが必要です" }, { status: 400 });
    }

    // 診断タイプの存在確認
    const diagnosisType = await prisma.diagnosisType.findUnique({
      where: { id: diagnosisTypeId },
      select: { id: true, name: true, clinicId: true },
    });

    if (!diagnosisType) {
      return NextResponse.json({ error: "診断タイプが見つかりません" }, { status: 404 });
    }

    // クリニック固有の診断タイプの場合は直接isActiveを更新
    if (diagnosisType.clinicId === clinicId) {
      await prisma.diagnosisType.update({
        where: { id: diagnosisTypeId },
        data: { isActive: isEnabled },
      });
    } else {
      // システム診断タイプの場合はClinicDiagnosisを更新
      await prisma.clinicDiagnosis.upsert({
        where: {
          clinicId_diagnosisTypeId: {
            clinicId,
            diagnosisTypeId,
          },
        },
        update: { isEnabled },
        create: {
          clinicId,
          diagnosisTypeId,
          isEnabled,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: isEnabled
        ? `${diagnosisType.name}を有効にしました`
        : `${diagnosisType.name}を無効にしました`,
    });
  } catch (error) {
    console.error("Admin clinic diagnosis type update error:", error);
    return NextResponse.json(
      { error: "診断タイプの更新に失敗しました" },
      { status: 500 }
    );
  }
}
