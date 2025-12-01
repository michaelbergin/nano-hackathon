import { NextResponse } from "next/server";
import { runNanoBananaEdit } from "@/lib/fal";
import { stackServerApp } from "@/stack/server";
import { createRateLimiter } from "@/lib/rateLimit";
import { syncUserToDatabase, type SyncedUser } from "@/lib/userSync";

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

/**
 * Checks if user status qualifies for pro endpoint access
 */
function hasProAccess(status: SyncedUser["status"]): boolean {
  return status === "userPro" || status === "admin";
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Get user from Stack Auth
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Sync user to database and get their status
    const dbUser = await syncUserToDatabase({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
    });

    if (!dbUser) {
      return NextResponse.json(
        { ok: false, error: "Failed to sync user" },
        { status: 500 }
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
    // Optional workflow parameter for workflow-specific generations
    const workflow = typeof body?.workflow === "string" ? body.workflow : null;

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Missing prompt" },
        { status: 400 }
      );
    }

    // Log workflow usage for analytics (optional)
    if (workflow) {
      console.log(`[nano-banana] Workflow: ${workflow}, User: ${dbUser.id}`);
    }

    // Route to pro endpoint if user is userPro or admin
    const usePro = hasProAccess(dbUser.status);

    const { imageUrl, raw } = await runNanoBananaEdit({
      prompt,
      images,
      usePro,
    });

    return NextResponse.json({ ok: true, image: imageUrl, raw });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
