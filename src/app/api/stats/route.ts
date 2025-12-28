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

    // 全体の統計を集計
    const [totalAccess, totalDiagnosis, totalCtaClick] = await Promise.all([
      prisma.accessLog.count({
        where: { channelId: { in: channelIds } },
      }),
      prisma.diagnosisSession.count({
        where: { channelId: { in: channelIds }, completedAt: { not: null } },
      }),
      prisma.ctaClick.count({
        where: { channelId: { in: channelIds } },
      }),
    ]);

    // QRコード別の統計を集計
    const channelStats = await Promise.all(
      channels.map(async (channel) => {
        const [accessCount, diagnosisCount, ctaClickCount] = await Promise.all([
          prisma.accessLog.count({
            where: { channelId: channel.id },
          }),
          prisma.diagnosisSession.count({
            where: { channelId: channel.id, completedAt: { not: null } },
          }),
          prisma.ctaClick.count({
            where: { channelId: channel.id },
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
