import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { JWT_SECRET } from "./jwt-secret";

const COOKIE_NAME = "auth_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: {
  clinicId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{
  clinicId: string;
  email: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { clinicId: string; email: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{
  clinicId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  return verifyToken(token);
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[COOKIE_NAME] || null;
}
