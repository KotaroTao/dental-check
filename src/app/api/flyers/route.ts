import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState } from "@/lib/subscription";

// 医院に属するチラシ一覧を取得（紐付くQR数も一緒に返す）
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Prisma の include + _count で「紐付くQR件数」も一緒に取得
    type FlyerWithCount = {
      id: string;
      name: string;
      distributionMethod: string | null;
      distributionQuantity: number | null;
      distributionPeriod: string | null;
      budget: number | null;
      imageUrl: string | null;
      imageUrl2: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { channels: number };
    };
    const flyers = (await prisma.flyer.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { channels: true } },
      },
    })) as unknown as FlyerWithCount[];

    return NextResponse.json({
      flyers: flyers.map((f) => ({
        id: f.id,
        name: f.name,
        distributionMethod: f.distributionMethod,
        distributionQuantity: f.distributionQuantity,
        distributionPeriod: f.distributionPeriod,
        budget: f.budget,
        imageUrl: f.imageUrl,
        imageUrl2: f.imageUrl2,
        channelCount: f._count.channels,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error("List flyers error:", error);
    return NextResponse.json(
      { error: "チラシ一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// チラシを新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const subscriptionState = await getSubscriptionState(session.clinicId);
    if (subscriptionState.isDemo) {
      return NextResponse.json(
        { error: "デモアカウントではチラシの作成はできません。" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      distributionMethod,
      distributionQuantity,
      distributionPeriod,
      budget,
      imageUrl,
      imageUrl2,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "チラシ名を入力してください" },
        { status: 400 }
      );
    }

    const flyer = await prisma.flyer.create({
      data: {
        clinicId: session.clinicId,
        name: name.trim(),
        distributionMethod: distributionMethod?.trim() || null,
        distributionQuantity:
          distributionQuantity !== null && distributionQuantity !== "" && distributionQuantity !== undefined
            ? parseInt(String(distributionQuantity), 10)
            : null,
        distributionPeriod: distributionPeriod?.trim() || null,
        budget:
          budget !== null && budget !== "" && budget !== undefined
            ? parseInt(String(budget), 10)
            : null,
        imageUrl: imageUrl || null,
        imageUrl2: imageUrl2 || null,
      },
    });

    return NextResponse.json({ flyer });
  } catch (error) {
    console.error("Create flyer error:", error);
    return NextResponse.json(
      { error: "チラシの作成に失敗しました" },
      { status: 500 }
    );
  }
}
