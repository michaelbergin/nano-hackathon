import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { stackServerApp } from "@/stack/server";

function ensureConfigured(): void {
  const url = process.env.CLOUDINARY_URL;
  if (url == null || url === "") {
    throw new Error("CLOUDINARY_URL is not set");
  }
  cloudinary.config({ cloudinary_url: url });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get user from Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    ensureConfigured();
    const body = (await req.json()) as unknown;
    const params =
      body != null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "params" in body
        ? (body as { params: Record<string, string | number | undefined> })
            .params
        : {};

    // Basic allowlist: only allow certain parameters to be signed to avoid abuse
    const allowedKeys = new Set([
      "timestamp",
      "folder",
      "public_id",
      "overwrite",
      "invalidate",
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
      if (v == null) {
        continue;
      }
      toSign[k] = String(v);
    }
    if (toSign.timestamp === "") {
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
      apiKey: cloudinary.config().api_key,
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
