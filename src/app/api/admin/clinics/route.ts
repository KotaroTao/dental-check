import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllPlans } from "@/lib/plans";

// 医院一覧を取得
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const clinics = await prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          select: {
            status: true,
            planType: true,
            trialEnd: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            channels: true,
            sessions: true,
          },
        },
      },
    });

    const clinicsWithPlan = clinics.map((clinic: typeof clinics[number]) => ({
      id: clinic.id,
      slug: clinic.slug,
      name: clinic.name,
      email: clinic.email,
      status: clinic.status,
      createdAt: clinic.createdAt,
      subscription: clinic.subscription
        ? {
            status: clinic.subscription.status,
            planType: (clinic.subscription as { planType?: string }).planType || "starter",
            trialEnd: clinic.subscription.trialEnd?.toISOString() || null,
            currentPeriodEnd: clinic.subscription.currentPeriodEnd?.toISOString() || null,
          }
        : null,
      channelCount: clinic._count.channels,
      sessionCount: clinic._count.sessions,
    }));

    return NextResponse.json({
      clinics: clinicsWithPlan,
      availablePlans: getAllPlans(),
    });
  } catch (error) {
    console.error("Admin clinics error:", error);
    return NextResponse.json(
      { error: "医院一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
