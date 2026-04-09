import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Channel } from "@/types/clinic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // QRコード一覧を取得
    const channels = (await prisma.channel.findMany({
      where: { clinicId: session.clinicId },
    })) as Channel[];

    const channelIds = channels.map((c) => c.id);

    // 全体の統計を集計（デモ・削除済みを除外）
    const [totalAccess, totalDiagnosis, totalCtaClick] = await Promise.all([
      prisma.accessLog.count({
        where: { channelId: { in: channelIds }, isDeleted: false },
      }),
      prisma.diagnosisSession.count({
        where: {
          channelId: { in: channelIds },
          completedAt: { not: null },
          isDemo: false,
          isDeleted: false,
        },
      }),
      prisma.cTAClick.count({
        where: {
          channelId: { in: channelIds },
          isDeleted: false,
        },
      }),
    ]);

    // QRコード別の統計を集計（デモ・削除済みを除外）
    const channelStats = await Promise.all(
      channels.map(async (channel) => {
        const [accessCount, diagnosisCount, ctaClickCount] = await Promise.all([
          prisma.accessLog.count({
            where: { channelId: channel.id, isDeleted: false },
          }),
          prisma.diagnosisSession.count({
            where: {
              channelId: channel.id,
              completedAt: { not: null },
              isDemo: false,
              isDeleted: false,
            },
          }),
          prisma.cTAClick.count({
            where: {
              channelId: channel.id,
              isDeleted: false,
            },
          }),
        ]);

        return {
          id: channel.id,
          name: channel.name,
          code: channel.code,
          accessCount,
          diagnosisCount,
          ctaClickCount,
        };
      })
    );

    return NextResponse.json({
      totalAccess,
      totalDiagnosis,
      totalCtaClick,
      channels: channelStats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "統計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
