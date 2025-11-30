import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";

const MAX_PROMPTS = 10;

/**
 * GET /api/prompts - List user's custom prompts
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const dbUser = await syncUserToDatabase({
      id: user.id,
      primaryEmail: user.primaryEmail,
      displayName: user.displayName,
    });

    if (!dbUser || !hasAppAccess(dbUser.status)) {
      return NextResponse.json(
        { ok: false, error: "Access denied - waitlist" },
        { status: 403 }
      );
    }

    const prompts = await prisma.prompt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_PROMPTS,
    });

    return NextResponse.json({ ok: true, prompts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/prompts - Create a new custom prompt
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const dbUser = await syncUserToDatabase({
      id: user.id,
      primaryEmail: user.primaryEmail,
      displayName: user.displayName,
    });

    if (!dbUser || !hasAppAccess(dbUser.status)) {
      return NextResponse.json(
        { ok: false, error: "Access denied - waitlist" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Prompt title is required" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt content is required" },
        { status: 400 }
      );
    }

    // Check if user has reached max prompts
    const existingCount = await prisma.prompt.count({
      where: { userId: user.id },
    });

    if (existingCount >= MAX_PROMPTS) {
      return NextResponse.json(
        { ok: false, error: `Maximum of ${MAX_PROMPTS} prompts allowed` },
        { status: 400 }
      );
    }

    const newPrompt = await prisma.prompt.create({
      data: {
        title,
        prompt,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true, prompt: newPrompt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

