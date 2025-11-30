import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { syncUserToDatabase, hasAppAccess } from "@/lib/userSync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/prompts/[id] - Update a custom prompt
 */
export async function PATCH(
  req: Request,
  { params }: RouteParams
): Promise<NextResponse> {
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

    const { id } = await params;
    const promptId = parseInt(id, 10);

    if (isNaN(promptId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid prompt ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Prompt not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: "Not authorized to update this prompt" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : undefined;

    if (title !== undefined && !title) {
      return NextResponse.json(
        { ok: false, error: "Prompt title cannot be empty" },
        { status: 400 }
      );
    }

    if (prompt !== undefined && !prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt content cannot be empty" },
        { status: 400 }
      );
    }

    const updateData: { title?: string; prompt?: string } = {};
    if (title !== undefined) {
      updateData.title = title;
    }
    if (prompt !== undefined) {
      updateData.prompt = prompt;
    }

    const updatedPrompt = await prisma.prompt.update({
      where: { id: promptId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, prompt: updatedPrompt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/prompts/[id] - Delete a custom prompt
 */
export async function DELETE(
  _req: Request,
  { params }: RouteParams
): Promise<NextResponse> {
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

    const { id } = await params;
    const promptId = parseInt(id, 10);

    if (isNaN(promptId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid prompt ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Prompt not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: "Not authorized to delete this prompt" },
        { status: 403 }
      );
    }

    await prisma.prompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

