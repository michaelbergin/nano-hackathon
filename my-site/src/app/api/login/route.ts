import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type Counter = { count: number; resetAt: number };
const loginRateLimiters: Map<string, Counter> = new Map();

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff != null && xff !== "") {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const xrip = req.headers.get("x-real-ip");
  if (xrip != null && xrip !== "") {
    return xrip;
  }
  return "unknown";
}

function isAllowedByRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = loginRateLimiters.get(key);
  if (existing == null || now >= existing.resetAt) {
    const fresh: Counter = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    loginRateLimiters.set(key, fresh);
    return true;
  }
  existing.count += 1;
  loginRateLimiters.set(key, existing);
  return existing.count <= RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req);
  if (!isAllowedByRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429 }
    );
  }
  const form = await req.formData();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");

  if (email === "" || password === "") {
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user == null) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = await signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
