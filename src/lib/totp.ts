import { generateSecret, generateURI, verifySync } from "otplib";

/**
 * TOTP（時間ベースワンタイムパスワード）ユーティリティ
 *
 * 2段階認証に使用。Google Authenticator等のアプリで
 * QRコードを読み取り、30秒ごとに変わる6桁のコードを生成する仕組み。
 */

/**
 * 新しいTOTPシークレットキーを生成
 */
export function generateTOTPSecret(): string {
  return generateSecret();
}

/**
 * QRコード用のotpauth URLを生成
 * Google Authenticator等で読み取るURL形式
 */
export function generateTOTPKeyUri(
  secret: string,
  email: string
): string {
  return generateURI({
    secret,
    label: email,
    issuer: "QRくるくる診断DX",
  });
}

/**
 * TOTPコードを検証
 * @param secret - 秘密鍵
 * @param token - ユーザーが入力した6桁コード
 * @returns 正しければtrue
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const result = verifySync({ secret, token });
    return result.valid;
  } catch {
    return false;
  }
}
