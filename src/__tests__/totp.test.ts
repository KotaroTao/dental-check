import { describe, it, expect } from "vitest";
import { generateTOTPSecret, generateTOTPKeyUri, verifyTOTP } from "@/lib/totp";
import { generateSync } from "otplib";

describe("TOTP", () => {
  it("シークレットを生成できる", () => {
    const secret = generateTOTPSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBeGreaterThan(10);
  });

  it("QRコード用URIを生成できる", () => {
    const secret = generateTOTPSecret();
    const uri = generateTOTPKeyUri(secret, "test@example.com");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("test%40example.com");
  });

  it("正しいTOTPコードを検証できる", () => {
    const secret = generateTOTPSecret();
    // 現在の有効なコードを生成
    const validToken = generateSync({ secret });
    expect(verifyTOTP(secret, validToken)).toBe(true);
  });

  it("不正なTOTPコードを拒否する", () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTP(secret, "000000")).toBe(false);
    expect(verifyTOTP(secret, "")).toBe(false);
  });

  it("異なるシークレットのコードを拒否する", () => {
    const secret1 = generateTOTPSecret();
    const secret2 = generateTOTPSecret();
    const token = generateSync({ secret: secret1 });
    expect(verifyTOTP(secret2, token)).toBe(false);
  });
});
