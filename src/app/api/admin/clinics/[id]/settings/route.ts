import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// 指定医院の設定を取得（管理者用）
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

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        mainColor: true,
        ctaConfig: true,
        clinicPage: true,
        status: true,
        isHidden: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            planType: true,
            trialEnd: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ clinic });
  } catch (error) {
    console.error("Admin clinic settings error:", error);
    return NextResponse.json(
      { error: "医院設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 指定医院の設定を更新（管理者用）
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

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone, logoUrl, mainColor, ctaConfig, clinicPage } = body;

    // 更新データを構築
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return NextResponse.json({ error: "医院名を入力してください" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (!email || email.trim() === "") {
        return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });
      }
      // メールアドレスの重複チェック
      const existingClinic = await prisma.clinic.findFirst({
        where: {
          email: email.trim(),
          id: { not: clinicId },
        },
      });
      if (existingClinic) {
        return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
      }
      updateData.email = email.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
    }

    if (mainColor !== undefined) {
      updateData.mainColor = mainColor || "#2563eb";
    }

    if (ctaConfig !== undefined) {
      updateData.ctaConfig = ctaConfig;
    }

    if (clinicPage !== undefined) {
      updateData.clinicPage = clinicPage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "更新するデータがありません" }, { status: 400 });
    }

    await prisma.clinic.update({
      where: { id: clinicId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "医院設定を更新しました",
    });
  } catch (error) {
    console.error("Admin clinic settings update error:", error);
    return NextResponse.json(
      { error: "医院設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
