/**
 * Generates a complete prompt for the nano-banana system by combining
 * a system prompt with the user's input prompt.
 */

/**
 * The system prompt that ensures the AI preserves the structure of input images
 * and properly augments sketches while respecting the input framework.
 */
const SYSTEM_PROMPT =
  "preserve the structure of the input image, if you receive a sketch, augment the sketch and respect your input framework, adapting where necessary to create the compelling image";

/**
 * Generates a complete prompt by combining the system prompt with the user's prompt.
 * The system prompt is prepended to ensure consistent behavior across all nano-banana generations.
 *
 * @param userPrompt - The user's specific prompt for image generation
 * @returns A complete prompt that includes both system instructions and user input
 */
export function generateSystemPrompt(userPrompt: string): string {
  if (!userPrompt || typeof userPrompt !== "string") {
    return SYSTEM_PROMPT;
  }

  // Combine system prompt with user prompt, ensuring proper separation
  return `${SYSTEM_PROMPT}. ${userPrompt}`;
}

/**
 * Validates that a prompt contains the required system prompt components.
 * Useful for testing and debugging.
 *
 * @param prompt - The complete prompt to validate
 * @returns true if the prompt contains the system prompt, false otherwise
 */
export function validateSystemPrompt(prompt: string): boolean {
  return prompt.startsWith(SYSTEM_PROMPT);
}
