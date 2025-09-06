import { fal } from "@fal-ai/client";

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

  const url =
    result?.images?.[0]?.url ||
    result?.image?.url ||
    result?.data?.images?.[0]?.url ||
    result?.data?.image?.url ||
    result?.output?.[0]?.url ||
    result?.output?.image?.url ||
    result?.url;

  if (!url || typeof url !== "string") {
    throw new Error("nano-banana/edit did not return an image URL");
  }

  return { imageUrl: url, raw: result };
}
