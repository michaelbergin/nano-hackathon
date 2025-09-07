import { NextResponse } from "next/server";
import { runNanoBananaEdit } from "@/lib/fal";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

type Counter = { count: number; resetAt: number };
const nanoBananaRateLimiters: Map<string, Counter> = new Map();

function getClientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff != null && xff !== "") {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const xrip = headers.get("x-real-ip");
  if (xrip != null && xrip !== "") {
    return xrip;
  }
  return "unknown";
}

function isAllowedByRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = nanoBananaRateLimiters.get(key);
  if (existing == null || now >= existing.resetAt) {
    const fresh: Counter = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    nanoBananaRateLimiters.set(key, fresh);
    return true;
  }
  existing.count += 1;
  nanoBananaRateLimiters.set(key, existing);
  return existing.count <= RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value ?? null;
    if (token == null) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    const payload = await verifyAuthToken(token);
    if (payload == null) {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const ip = getClientIpFromHeaders(req.headers);
    if (!isAllowedByRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        { status: 429 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    const images = Array.isArray(body?.images) ? body.images : [];

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Missing prompt" },
        { status: 400 }
      );
    }

    const { imageUrl, raw } = await runNanoBananaEdit({ prompt, images });

    return NextResponse.json({ ok: true, image: imageUrl, raw });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
