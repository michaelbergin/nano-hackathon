import { fal } from "@fal-ai/client";
import type { JSX } from "react";

type ImageUrl = string;

type NanoBananaEditInput = {
  prompt: string;
  images?: ImageUrl[];
};

export type NanoBananaEditResult = {
  imageUrl: string;
  raw: unknown;
};

function assertEnv() {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not set. Add it to your environment.");
  }
}

function configureFal() {
  assertEnv();
  fal.config({ credentials: process.env.FAL_KEY as string });
}

export async function runNanoBananaEdit({
  prompt,
  images = [],
}: NanoBananaEditInput): Promise<NanoBananaEditResult> {
  configureFal();

  const first = images[0];

  const input: Record<string, unknown> = {
    prompt,
  };

  if (first) {
    input["image_url"] = first;
    input["image"] = first;
    input["image_urls"] = images;
    input["images"] = images;
  }

  const result: unknown = await fal.run("fal-ai/nano-banana/edit", {
    input,
  });

  const anyResult = result as Record<string, unknown>;
  const url =
    (anyResult?.images as Array<{ url?: unknown }> | undefined)?.[0]?.url ||
    (anyResult?.image as { url?: unknown } | undefined)?.url ||
    ((anyResult?.data as { images?: Array<{ url?: unknown }>; image?: { url?: unknown } } | undefined)?.images?.[0]?.url) ||
    ((anyResult?.data as { images?: Array<{ url?: unknown }>; image?: { url?: unknown } } | undefined)?.image?.url) ||
    (anyResult?.output as Array<{ url?: unknown }> | undefined)?.[0]?.url ||
    (anyResult?.output as { image?: { url?: unknown } } | undefined)?.image?.url ||
    (anyResult?.url as unknown);

  if (!url || typeof url !== "string") {
    throw new Error("nano-banana/edit did not return an image URL");
  }

  return { imageUrl: url, raw: result };
}
