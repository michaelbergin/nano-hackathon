import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  req: Request,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

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
    const body = (await req.json().catch(() => ({}))) as unknown;
    const obj = (body && typeof body === "object" ? body : {}) as {
      data?: unknown;
      name?: unknown;
    };
    const data = typeof obj.data === "string" ? obj.data : null;
    const nameRaw = typeof obj.name === "string" ? obj.name : null;
    const name = nameRaw ? nameRaw.trim() : null;

    // Update project (ensure user owns the project)
    const project = await prisma.project.updateMany({
      where: {
        id: projectId,
        userId: payload.userId,
      },
      data: {
        data,
        ...(name !== null ? { name } : {}),
      },
    });

    if (project.count === 0) {
      return NextResponse.json(
        { ok: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
