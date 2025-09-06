import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // Get user from auth cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value ?? null;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 401 }
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
        userId: payload.userId,
      },
    });

    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
