import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getPlan, type PlanType } from "@/lib/plans";

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

// 医院のプラン設定を更新
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
    const { planType } = body;

    // プランタイプの検証（管理者は全プラン設定可能）
    const validPlanTypes: PlanType[] = ["starter", "standard", "custom", "managed", "free"];
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

    // 無料プランの場合は active に設定
    const newStatus = planType === "free" ? "active" : clinic.subscription.status;

    await prisma.subscription.update({
      where: { id: clinic.subscription.id },
      data: {
        planType: planType,
        status: newStatus,
        // 無料プランの場合は期限を無効に
        ...(planType === "free" && {
          currentPeriodEnd: null,
          trialEnd: null,
          gracePeriodEnd: null,
        }),
      },
    });

    // 医院ステータスも更新
    if (planType === "free" || newStatus === "active") {
      await prisma.clinic.update({
        where: { id },
        data: { status: "active" },
      });
    }

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
