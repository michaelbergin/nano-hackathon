import { NextResponse } from "next/server";
import { runNanoBananaEdit } from "@/lib/fal";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rateLimit";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const limiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  prefix: "nano-banana",
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

async function isAllowedByRateLimit(key: string): Promise<boolean> {
  const result = await limiter.check(key);
  return result.allowed;
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
    if (!(await isAllowedByRateLimit(ip))) {
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
