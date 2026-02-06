import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllPlans, type PlanType } from "@/lib/plans";
import { hashPassword } from "@/lib/auth";
import crypto from "crypto";

// 医院一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showHidden = searchParams.get("hidden") === "true";

    const clinics = await prisma.clinic.findMany({
      where: { isHidden: showHidden },
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
        invitationTokens: {
          where: { type: "invitation" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            token: true,
            expiresAt: true,
            usedAt: true,
            createdAt: true,
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "";

    const clinicsWithPlan = clinics.map((clinic: typeof clinics[number]) => {
      const latestInvite = clinic.invitationTokens[0] || null;
      let invitationStatus: "none" | "pending" | "expired" | "used" = "none";
      let inviteUrl: string | null = null;

      if (latestInvite) {
        if (latestInvite.usedAt) {
          invitationStatus = "used";
        } else if (new Date() > latestInvite.expiresAt) {
          invitationStatus = "expired";
        } else {
          invitationStatus = "pending";
          inviteUrl = `${baseUrl}/invite/${latestInvite.token}`;
        }
      }

      return {
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        email: clinic.email,
        status: clinic.status,
        isHidden: clinic.isHidden,
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
        invitationStatus,
        inviteUrl,
      };
    });

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

// 医院を新規作成（管理者による招待用）
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, planType } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "医院名とメールアドレスは必須です" },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existing = await prisma.clinic.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    // スラッグ生成
    const slug = generateSlug();

    // ログイン不可なダミーパスワードハッシュ
    const dummyPasswordHash = await hashPassword(crypto.randomUUID());

    // プランタイプのバリデーション
    const validPlans: PlanType[] = ["starter", "standard", "custom", "managed", "free", "demo"];
    const selectedPlan: PlanType = validPlans.includes(planType) ? planType : "starter";
    const isFreePlan = selectedPlan === "free" || selectedPlan === "demo";

    // 医院を作成
    const clinic = await prisma.clinic.create({
      data: {
        name,
        email,
        passwordHash: dummyPasswordHash,
        phone: phone || null,
        slug,
        status: "pending",
      },
    });

    // サブスクリプションを作成
    await prisma.subscription.create({
      data: {
        clinicId: clinic.id,
        status: isFreePlan ? "active" : "trial",
        planType: selectedPlan,
        ...(isFreePlan
          ? {}
          : {
              trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }),
      },
    });

    // 招待トークンを発行（7日間有効）
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invitationToken.create({
      data: {
        clinicId: clinic.id,
        token,
        type: "invitation",
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return NextResponse.json(
      {
        success: true,
        message: `${name}のアカウントを作成しました`,
        clinic: {
          id: clinic.id,
          name: clinic.name,
          email: clinic.email,
          slug: clinic.slug,
        },
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create clinic error:", error);
    return NextResponse.json(
      { error: "医院の作成に失敗しました" },
      { status: 500 }
    );
  }
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
