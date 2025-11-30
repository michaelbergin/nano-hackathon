/*
  Simple test script for POST /api/nano-banana

  Usage:
    yarn ts-node --compiler-options '{"module":"commonjs"}' scripts/test-nano-banana.ts

  Environment:
    - SERVER_ORIGIN (optional): defaults to http://localhost:3001
    - TEST_IMAGE_URL (optional): public image URL; if unset we use a tiny data URI
    - TEST_PROMPT (optional): custom prompt to test; defaults to "banana-fy test"
*/

async function main(): Promise<void> {
  const origin = process.env.SERVER_ORIGIN ?? "http://localhost:3001";
  const url = `${origin}/api/nano-banana`;

  const defaultPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIUlEQVQoU2NkYGBg+M+ABYwMjAxGQwMD/7E0GAAAK2wE5j3I0c4AAAAASUVORK5CYII=";

  const image = process.env.TEST_IMAGE_URL ?? defaultPng;
  const prompt = process.env.TEST_PROMPT ?? "Make my sketch realistic";

  // Test the system prompt generation
  try {
    const { generateSystemPrompt } = await import(
      "../src/lib/generateSystemPrompt"
    );
    const testPrompt = "make this image look amazing";
    const systemPrompt = generateSystemPrompt(testPrompt);
    console.log("System prompt test:");
    console.log("Input:", testPrompt);
    console.log("Output:", systemPrompt);
    console.log(
      "Contains system prompt:",
      systemPrompt.includes("preserve the structure of the input image")
    );
    console.log("---");
  } catch (err) {
    console.warn("Could not test system prompt generation:", err);
  }

  console.log("POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images: [image] }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
