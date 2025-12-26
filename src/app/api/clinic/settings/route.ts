import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Clinic } from "@/types/clinic";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { name, logoUrl, mainColor, ctaConfig } = body;

    const clinic = (await prisma.clinic.update({
      where: { id: session.clinicId },
      data: {
        ...(name !== undefined && { name }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(mainColor !== undefined && { mainColor }),
        ...(ctaConfig !== undefined && { ctaConfig }),
      },
    })) as Clinic;

    return NextResponse.json({
      clinic: {
        id: clinic.id,
        name: clinic.name,
        logoUrl: clinic.logoUrl,
        mainColor: clinic.mainColor,
        ctaConfig: clinic.ctaConfig,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
