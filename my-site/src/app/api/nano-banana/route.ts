import { NextResponse } from "next/server";
import { runNanoBananaEdit } from "@/lib/fal";

export async function POST(req: Request) {
  try {
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
