import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/**
 * D3: 管理者操作の監査ログ
 *
 * 管理者が行った操作を記録して追跡可能にする。
 * 「誰が・いつ・何をしたか」を後から確認できる。
 */

interface AuditLogParams {
  adminId: string;
  action: string;            // 操作種別（例: "clinic.create", "clinic.impersonate"）
  targetType?: string;       // 対象の種類（例: "clinic", "diagnosis"）
  targetId?: string;         // 対象のID
  details?: Record<string, unknown>; // 追加情報
  request?: NextRequest;     // IPアドレス取得用
}

/**
 * 監査ログを記録する
 * エラーが起きてもアプリの処理を止めない（ログ記録失敗は許容）
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    let ipAddress: string | null = null;
    if (params.request) {
      ipAddress =
        params.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        params.request.headers.get("x-real-ip") ||
        null;
    }

    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        details: params.details || null,
        ipAddress,
      },
    });
  } catch (error) {
    // 監査ログの記録失敗はアプリの動作を止めない
    console.error("[AuditLog] 記録失敗:", error);
  }
}
