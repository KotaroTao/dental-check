import { describe, it, expect } from "vitest";
import { validatePassword } from "@/lib/password-validation";

describe("validatePassword", () => {
  it("8文字以上で英字+数字を含むパスワードは有効", () => {
    expect(validatePassword("abcde123")).toEqual({ valid: true, error: null });
    expect(validatePassword("Password1")).toEqual({ valid: true, error: null });
    expect(validatePassword("a1b2c3d4e5")).toEqual({ valid: true, error: null });
  });

  it("8文字未満は無効", () => {
    const result = validatePassword("abc123");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("8文字以上");
  });

  it("空文字は無効", () => {
    expect(validatePassword("").valid).toBe(false);
  });

  it("英字のみは無効（数字が必要）", () => {
    const result = validatePassword("abcdefgh");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("数字");
  });

  it("数字のみは無効（英字が必要）", () => {
    const result = validatePassword("12345678");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("英字");
  });
});
