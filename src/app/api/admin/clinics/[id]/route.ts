import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getPlan, type PlanType } from "@/lib/plans";
import { createAuditLog } from "@/lib/audit-log";

// 医院詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: {
          select: {
            channels: true,
            sessions: true,
          },
        },
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    const planType = ((clinic.subscription as { planType?: string })?.planType as PlanType) || "starter";
    const plan = getPlan(planType);

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        status: clinic.status,
        createdAt: clinic.createdAt,
        subscription: clinic.subscription
          ? {
              id: clinic.subscription.id,
              status: clinic.subscription.status,
              planType: planType,
              planName: plan.name,
              trialEnd: clinic.subscription.trialEnd?.toISOString() || null,
              currentPeriodStart: clinic.subscription.currentPeriodStart?.toISOString() || null,
              currentPeriodEnd: clinic.subscription.currentPeriodEnd?.toISOString() || null,
              canceledAt: clinic.subscription.canceledAt?.toISOString() || null,
            }
          : null,
        channelCount: clinic._count.channels,
        sessionCount: clinic._count.sessions,
      },
    });
  } catch (error) {
    console.error("Admin clinic detail error:", error);
    return NextResponse.json(
      { error: "医院情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 医院のプラン設定・非表示設定を更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { planType, isHidden, excludeFromAnalysis } = body;

    // チラシ分析除外設定の更新
    if (typeof excludeFromAnalysis === "boolean") {
      await prisma.clinic.update({
        where: { id },
        data: { excludeFromAnalysis },
      });
      return NextResponse.json({
        success: true,
        message: excludeFromAnalysis ? "チラシ分析から除外しました" : "チラシ分析に含めるようにしました",
      });
    }

    // 非表示設定の更新
    if (typeof isHidden === "boolean") {
      await prisma.clinic.update({
        where: { id },
        data: { isHidden },
      });
      return NextResponse.json({
        success: true,
        message: isHidden ? "医院を非表示にしました" : "医院を表示に戻しました",
      });
    }

    // プランタイプの検証（管理者は全プラン設定可能）
    const validPlanTypes: PlanType[] = ["starter", "standard", "custom", "managed", "free", "demo"];
    if (!planType || !validPlanTypes.includes(planType)) {
      return NextResponse.json(
        { error: "無効なプランタイプです" },
        { status: 400 }
      );
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    if (!clinic.subscription) {
      return NextResponse.json(
        { error: "サブスクリプション情報がありません" },
        { status: 400 }
      );
    }

    // プランを更新
    const plan = getPlan(planType);

    // 無料プランまたはデモプランの場合は active に設定
    const isFreePlan = planType === "free" || planType === "demo";
    const newStatus = isFreePlan ? "active" : clinic.subscription.status;

    await prisma.subscription.update({
      where: { id: clinic.subscription.id },
      data: {
        planType: planType,
        status: newStatus,
        // 無料プラン/デモプランの場合は期限を無効に
        ...(isFreePlan && {
          currentPeriodEnd: null,
          trialEnd: null,
          gracePeriodEnd: null,
        }),
      },
    });

    // 医院ステータスも更新
    if (isFreePlan || newStatus === "active") {
      await prisma.clinic.update({
        where: { id },
        data: { status: "active" },
      });
    }

    // D3: 監査ログ
    await createAuditLog({
      adminId: session.adminId,
      action: "clinic.plan_change",
      targetType: "clinic",
      targetId: id,
      details: { newPlanType: planType, planName: plan.name },
      request,
    });

    return NextResponse.json({
      success: true,
      message: `プランを${plan.name}に変更しました`,
    });
  } catch (error) {
    console.error("Admin clinic update error:", error);
    return NextResponse.json(
      { error: "プランの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// 医院を完全削除（非表示の医院のみ、管理者パスワード必須）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "管理者パスワードを入力してください" }, { status: 400 });
    }

    // 管理者パスワードを検証
    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { passwordHash: true },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 403 });
    }

    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      select: { isHidden: true, name: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    // 非表示の医院のみ削除可能
    if (!clinic.isHidden) {
      return NextResponse.json(
        { error: "非表示にした医院のみ削除できます。先に非表示にしてください。" },
        { status: 400 }
      );
    }

    // D3: 監査ログ（削除前に記録）
    await createAuditLog({
      adminId: session.adminId,
      action: "clinic.delete",
      targetType: "clinic",
      targetId: id,
      details: { clinicName: clinic.name },
      request,
    });

    // 医院を削除（関連データはCascadeで自動削除）
    await prisma.clinic.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `${clinic.name}を完全に削除しました`,
    });
  } catch (error) {
    console.error("Admin clinic delete error:", error);
    return NextResponse.json(
      { error: "医院の削除に失敗しました" },
      { status: 500 }
    );
  }
}
