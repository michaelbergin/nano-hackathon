import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
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
