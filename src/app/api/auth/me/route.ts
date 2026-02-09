import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { Clinic } from "@/types/clinic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const clinic = (await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      include: {
        subscription: true,
      },
    })) as Clinic | null;

    if (!clinic) {
      return NextResponse.json(
        { error: "医院が見つかりません" },
        { status: 404 }
      );
    }

    // 管理者がなりすましでログインしているか確認
    const adminSession = await getAdminSession();
    const isImpersonating = !!adminSession;

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        slug: clinic.slug,
        phone: clinic.phone,
        logoUrl: clinic.logoUrl,
        mainColor: clinic.mainColor,
        ctaConfig: clinic.ctaConfig,
        totpEnabled: clinic.totpEnabled ?? false,
        status: clinic.status,
        subscription: clinic.subscription
          ? {
              status: clinic.subscription.status,
              trialEnd: clinic.subscription.trialEnd,
              currentPeriodEnd: clinic.subscription.currentPeriodEnd,
            }
          : null,
      },
      isImpersonating,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "セッションの取得に失敗しました" },
      { status: 500 }
    );
  }
}
