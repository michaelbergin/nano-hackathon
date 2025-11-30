import { fal } from "@fal-ai/client";
import { generateSystemPrompt } from "./generateSystemPrompt";

type ImageUrl = string;

type NanoBananaEditInput = {
  prompt: string;
  images?: ImageUrl[];
  usePro?: boolean;
};

export type NanoBananaEditResult = {
  imageUrl: string;
  raw: unknown;
};

const NANO_BANANA_STANDARD_ENDPOINT = "fal-ai/nano-banana/edit";
const NANO_BANANA_PRO_ENDPOINT = "fal-ai/nano-banana-pro/edit";

function assertEnv(): void {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not set. Add it to your environment.");
  }
}

function configureFal(): void {
  assertEnv();
  fal.config({ credentials: process.env.FAL_KEY as string });
}

/**
 * Runs the nano-banana edit endpoint.
 * @param prompt - The prompt for image generation
 * @param images - Optional array of image URLs
 * @param usePro - If true, uses the nano-banana-pro endpoint (for userPro/admin users)
 */
export async function runNanoBananaEdit({
  prompt,
  images = [],
  usePro = false,
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

  const endpoint = usePro ? NANO_BANANA_PRO_ENDPOINT : NANO_BANANA_STANDARD_ENDPOINT;

  const result = await fal.subscribe(endpoint, {
    input,
    logs: false,
  });

  const data = result.data as unknown as {
    images?: Array<{ url?: string }>;
    image?: { url?: string };
  };
  const url = data.images?.[0]?.url ?? data.image?.url;
  if (!url || typeof url !== "string") {
    throw new Error(`${endpoint} did not return an image URL`);
  }

  return { imageUrl: url, raw: result };
}
