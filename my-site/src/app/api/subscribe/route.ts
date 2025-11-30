import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Rate limit: 5 subscribe attempts per minute per IP */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const limiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  prefix: "subscribe",
});

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

export async function POST(req: Request): Promise<Response> {
  // Rate limit check
  const ip = getClientIpFromHeaders(req.headers);
  const rateLimitResult = await limiter.check(ip);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  try {
    await prisma.subscriber.create({ data: { email } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Already subscribed?" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
