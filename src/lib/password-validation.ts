/**
 * パスワード強度チェック（共通バリデーション）
 *
 * 使う場所: サインアップ、パスワードリセット、招待受諾
 * ルール:
 *   - 8文字以上
 *   - 英字（a-z, A-Z）を1文字以上含む
 *   - 数字（0-9）を1文字以上含む
 *
 * ※ 特殊文字は必須にしない（歯科医院スタッフの使いやすさ優先）
 */

export function validatePassword(password: string): {
  valid: boolean;
  error: string | null;
} {
  if (!password || password.length < 8) {
    return {
      valid: false,
      error: "パスワードは8文字以上で入力してください",
    };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      error: "パスワードには英字を1文字以上含めてください",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "パスワードには数字を1文字以上含めてください",
    };
  }

  return { valid: true, error: null };
}
