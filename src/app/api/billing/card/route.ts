import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payjp } from "@/lib/payjp";

// カード情報を登録/更新
export async function POST(request: NextRequest) {
  try {
    if (!payjp) {
      return NextResponse.json(
        { error: "決済機能が利用できません" },
        { status: 503 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "カードトークンが必要です" },
        { status: 400 }
      );
    }

    // サブスクリプション情報を取得
    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: session.clinicId },
    });

    let customerId = subscription?.payjpCustomerId;

    if (customerId) {
      // 既存の顧客にカードを更新
      await payjp.customers.update(customerId, {
        card: token,
      });
    } else {
      // 新規顧客を作成
      const clinic = await prisma.clinic.findUnique({
        where: { id: session.clinicId },
        select: { email: true, name: true },
      });

      const customer = await payjp.customers.create({
        email: clinic?.email,
        description: clinic?.name,
        card: token,
      });

      customerId = customer.id;

      // サブスクリプションレコードを更新
      await prisma.subscription.update({
        where: { clinicId: session.clinicId },
        data: { payjpCustomerId: customerId },
      });
    }

    // カード情報を取得
    const customer = await payjp.customers.retrieve(customerId);
    const card = customer.cards?.data?.[0];

    return NextResponse.json({
      card: card
        ? {
            last4: card.last4,
            brand: card.brand,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          }
        : null,
    });
  } catch (error) {
    console.error("Card registration error:", error);
    return NextResponse.json(
      { error: "カード登録に失敗しました" },
      { status: 500 }
    );
  }
}

// カード情報を取得
export async function GET() {
  try {
    if (!payjp) {
      return NextResponse.json(
        { error: "決済機能が利用できません" },
        { status: 503 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: session.clinicId },
    });

    if (!subscription?.payjpCustomerId) {
      return NextResponse.json({ card: null });
    }

    const customer = await payjp.customers.retrieve(subscription.payjpCustomerId);
    const card = customer.cards?.data?.[0];

    return NextResponse.json({
      card: card
        ? {
            last4: card.last4,
            brand: card.brand,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          }
        : null,
    });
  } catch (error) {
    console.error("Get card error:", error);
    return NextResponse.json(
      { error: "カード情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// カード情報を削除
export async function DELETE() {
  try {
    if (!payjp) {
      return NextResponse.json(
        { error: "決済機能が利用できません" },
        { status: 503 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { clinicId: session.clinicId },
    });

    if (!subscription?.payjpCustomerId) {
      return NextResponse.json({ error: "カードが登録されていません" }, { status: 400 });
    }

    const customer = await payjp.customers.retrieve(subscription.payjpCustomerId);
    const card = customer.cards?.data?.[0];

    if (card) {
      await payjp.customers.cards.delete(subscription.payjpCustomerId, card.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete card error:", error);
    return NextResponse.json(
      { error: "カード削除に失敗しました" },
      { status: 500 }
    );
  }
}
