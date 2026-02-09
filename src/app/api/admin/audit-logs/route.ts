import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * D3: 監査ログ一覧API
 * 管理者が過去の操作を確認するためのエンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0") || 0);
    const action = searchParams.get("action"); // フィルター用

    const where = action ? { action } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((log: { id: string; admin: { name: string | null; email: string }; action: string; targetType: string | null; targetId: string | null; details: unknown; ipAddress: string | null; createdAt: Date }) => ({
        id: log.id,
        adminName: log.admin.name || log.admin.email,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "監査ログの取得に失敗しました" },
      { status: 500 }
    );
  }
}
