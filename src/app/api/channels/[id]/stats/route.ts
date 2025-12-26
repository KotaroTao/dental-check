import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIAGNOSIS_TYPES = ["oral-age", "child-orthodontics"];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const channelId = params.id;

    // チャネルの所有権を確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "経路が見つかりません" },
        { status: 404 }
      );
    }

    if (channel.clinicId !== session.clinicId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // 診断タイプ別の統計を取得
    const byDiagnosisType: Record<
      string,
      {
        accessCount: number;
        diagnosisCount: number;
        ctaClickCount: number;
      }
    > = {};

    // 各診断タイプごとに統計を取得
    for (const diagnosisType of DIAGNOSIS_TYPES) {
      // アクセス数（diagnosis_type_slugでフィルタ）
      const accessLogs = await prisma.$queryRaw(
        `SELECT COUNT(*) as count FROM access_logs
         WHERE channel_id = $1 AND diagnosis_type_slug = $2`,
        channelId,
        diagnosisType
      ) as { count: string }[];
      const accessCount = parseInt(accessLogs[0]?.count || "0", 10);

      // 診断完了数
      // diagnosis_sessionsにはdiagnosis_type_idがあるので、まずdiagnosis_typesからIDを取得
      const diagnosisTypeRecord = await prisma.diagnosisType.findUnique({
        where: { slug: diagnosisType },
      });

      let diagnosisCount = 0;
      let ctaClickCount = 0;

      if (diagnosisTypeRecord) {
        // 診断完了数
        const sessions = await prisma.$queryRaw(
          `SELECT COUNT(*) as count FROM diagnosis_sessions
           WHERE channel_id = $1 AND diagnosis_type_id = $2 AND completed_at IS NOT NULL`,
          channelId,
          diagnosisTypeRecord.id
        ) as { count: string }[];
        diagnosisCount = parseInt(sessions[0]?.count || "0", 10);

        // CTAクリック数（診断セッション経由）
        const ctaClicks = await prisma.$queryRaw(
          `SELECT COUNT(*) as count FROM cta_clicks
           WHERE channel_id = $1 AND session_id IN (
             SELECT id FROM diagnosis_sessions
             WHERE channel_id = $1 AND diagnosis_type_id = $2
           )`,
          channelId,
          diagnosisTypeRecord.id
        ) as { count: string }[];
        ctaClickCount = parseInt(ctaClicks[0]?.count || "0", 10);
      }

      byDiagnosisType[diagnosisType] = {
        accessCount,
        diagnosisCount,
        ctaClickCount,
      };
    }

    // 全体統計
    const totalAccessLogs = await prisma.$queryRaw(
      `SELECT COUNT(*) as count FROM access_logs WHERE channel_id = $1`,
      channelId
    ) as { count: string }[];
    const totalAccess = parseInt(totalAccessLogs[0]?.count || "0", 10);

    const totalSessions = await prisma.$queryRaw(
      `SELECT COUNT(*) as count FROM diagnosis_sessions
       WHERE channel_id = $1 AND completed_at IS NOT NULL`,
      channelId
    ) as { count: string }[];
    const totalDiagnosis = parseInt(totalSessions[0]?.count || "0", 10);

    const totalCtaClicks = await prisma.$queryRaw(
      `SELECT COUNT(*) as count FROM cta_clicks WHERE channel_id = $1`,
      channelId
    ) as { count: string }[];
    const totalCtaClick = parseInt(totalCtaClicks[0]?.count || "0", 10);

    return NextResponse.json({
      channelId,
      channelName: channel.name,
      totalAccess,
      totalDiagnosis,
      totalCtaClick,
      byDiagnosisType,
    });
  } catch (error) {
    console.error("Channel stats error:", error);
    return NextResponse.json(
      { error: "統計情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
