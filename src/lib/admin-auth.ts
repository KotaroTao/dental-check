import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const ADMIN_COOKIE_NAME = "admin_auth_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createAdminToken(payload: {
  adminId: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ ...payload, isAdmin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(token: string): Promise<{
  adminId: string;
  email: string;
  isAdmin: boolean;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.isAdmin) return null;
    return payload as { adminId: string; email: string; isAdmin: boolean };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{
  adminId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyAdminToken(token);
  if (!payload) return null;

  return { adminId: payload.adminId, email: payload.email };
}

export function getAdminTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[ADMIN_COOKIE_NAME] || null;
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}
