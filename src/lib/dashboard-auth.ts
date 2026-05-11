// ダッシュボードAPIの共通認証ヘルパー。
// 医院ユーザー（getSession）と管理者（getAdminSession + ?clinicId=...）
// の両方を許可する。
//
// 何のため？
//   /api/dashboard/* は医院が自分のデータを見るための API なので、
//   通常は getSession() の clinic セッションだけを期待していた。
//   ただし管理者画面（/admin/flyer-analysis）で同じ統計を一覧表示したい
//   ケースが出てきたので、管理者の場合は ?clinicId=... を信用して
//   その医院のデータを返せるようにする。
//
// 戻り値:
//   { clinicId } を返す。認証されていなければ null。
//   呼び出し側は null の場合 401 を返すこと。

import { NextRequest } from "next/server";
import { getSession } from "./auth";
import { getAdminSession } from "./admin-auth";

export async function resolveClinicContext(
  request: NextRequest
): Promise<{ clinicId: string } | null> {
  // 1) 医院セッションがあればそれを優先
  const session = await getSession();
  if (session) {
    return { clinicId: session.clinicId };
  }

  // 2) 管理者セッション + ?clinicId=... があれば許可
  const admin = await getAdminSession();
  if (admin) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    if (clinicId) {
      return { clinicId };
    }
  }

  return null;
}
