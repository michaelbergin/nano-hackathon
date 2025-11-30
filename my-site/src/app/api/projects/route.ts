import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";

export async function POST(req: Request) {
  try {
    // Get user from Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Sync user to database and check access
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

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
