import { fal } from "@fal-ai/client";
import { generateSystemPrompt } from "./generateSystemPrompt";

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

  // Generate complete prompt with system prompt prepended
  const completePrompt = generateSystemPrompt(prompt);

  const input: Record<string, unknown> = {
    prompt: completePrompt,
    image_urls: images,
    num_images: 1,
    output_format: "png",
  };

  const result = await fal.subscribe("fal-ai/nano-banana/edit", {
    input,
    logs: false,
  });

  const data = result.data as unknown as {
    images?: Array<{ url?: string }>;
    image?: { url?: string };
  };
  const url = data.images?.[0]?.url ?? data.image?.url;
  if (!url || typeof url !== "string") {
    throw new Error("nano-banana/edit did not return an image URL");
  }

  return { imageUrl: url, raw: result };
}
