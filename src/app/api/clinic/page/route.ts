import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ClinicPage } from "@/types/clinic";

// 医院紹介ページ情報を取得
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        id: true,
        slug: true,
        name: true,
        phone: true,
        logoUrl: true,
        mainColor: true,
        clinicPage: true,
        ctaConfig: true,
        _count: {
          select: { channels: true },
        },
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "医院が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      clinic: {
        ...clinic,
        channelCount: clinic._count.channels,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error("Get clinic page error:", error);
    return NextResponse.json(
      { error: "情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 医院紹介ページ情報を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const clinicPage: ClinicPage = body.clinicPage;

    // URLの形式を検証するヘルパー関数（相対URLも許可）
    const isValidUrl = (url: string): boolean => {
      // 相対URL（/で始まる）を許可
      if (url.startsWith("/")) {
        return true;
      }
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    };

    // バリデーション
    if (clinicPage.photos) {
      if (!Array.isArray(clinicPage.photos)) {
        return NextResponse.json(
          { error: "写真は配列で指定してください" },
          { status: 400 }
        );
      }
      // 写真URLの検証
      for (const photo of clinicPage.photos) {
        if (!photo.url || typeof photo.url !== "string") {
          return NextResponse.json(
            { error: "写真URLは必須です" },
            { status: 400 }
          );
        }
        if (!isValidUrl(photo.url)) {
          return NextResponse.json(
            { error: "写真URLの形式が正しくありません" },
            { status: 400 }
          );
        }
      }
    }

    // 院長写真URLの検証
    if (clinicPage.director?.photoUrl && !isValidUrl(clinicPage.director.photoUrl)) {
      return NextResponse.json(
        { error: "院長写真URLの形式が正しくありません" },
        { status: 400 }
      );
    }

    const clinic = await prisma.clinic.update({
      where: { id: session.clinicId },
      data: {
        clinicPage: clinicPage as object,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        clinicPage: true,
      },
    });

    return NextResponse.json({ clinic });
  } catch (error) {
    console.error("Update clinic page error:", error);
    return NextResponse.json(
      { error: "情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}
