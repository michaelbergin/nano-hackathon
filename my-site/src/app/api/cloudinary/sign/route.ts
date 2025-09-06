import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

function ensureConfigured(): void {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error("CLOUDINARY_URL is not set");
  }
  cloudinary.config({ cloudinary_url: url });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    ensureConfigured();
    const body = (await req.json()) as unknown;
    const params =
      body &&
      typeof body === "object" &&
      "params" in (body as Record<string, unknown>)
        ? (body as { params: Record<string, string | number | undefined> })
            .params ?? {}
        : {};

    // Basic allowlist: only allow certain parameters to be signed to avoid abuse
    const allowedKeys = new Set([
      "timestamp",
      "folder",
      "public_id",
      "sources",
      "asset_folder",
      "tags",
      "context",
      "transformation",
      "eager",
    ]);
    const toSign: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (!allowedKeys.has(k)) {
        continue;
      }
      if (v === undefined || v === null) {
        continue;
      }
      toSign[k] = String(v);
    }
    if (!toSign.timestamp) {
      toSign.timestamp = String(Math.floor(Date.now() / 1000));
    }

    const signature = cloudinary.utils.api_sign_request(
      toSign,
      cloudinary.config().api_secret as string
    );
    return NextResponse.json({
      ok: true,
      signature,
      params: toSign,
      cloudName: cloudinary.config().cloud_name,
    });
  } catch {
    // Avoid leaking secrets in error messages
    return NextResponse.json(
      { ok: false, error: "Cloudinary not configured" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
