/**
 * Generates a complete prompt for the nano-banana system by combining
 * a system prompt with the user's input prompt.
 */

import type { WorkflowType } from "@/components/WelcomeScreen";

/**
 * The default system prompt that ensures the AI preserves the structure of input images
 * and properly augments sketches while respecting the input framework.
 */
const DEFAULT_SYSTEM_PROMPT =
  "preserve the structure of the input image, if you receive a sketch, augment the sketch and respect your input framework, adapting where necessary to create the compelling image";

/**
 * Workflow-specific system prompts that modify generation behavior
 * based on the user's selected workflow type.
 */
const WORKFLOW_SYSTEM_PROMPTS: Record<WorkflowType, string> = {
  draw: "you are a coloring book artist creating traceable outlines for children. generate a clean halftone or line-art style image with clear, simple outlines that are easy to trace over. use light gray or pale lines on a white background, like a coloring book page. avoid filled colors, shading, or complex details. focus on bold, smooth contours that a child can follow with a pencil or crayon. the image should be simple, friendly, and age-appropriate",

  learn:
    "you are an educational visual assistant. create clear, easy-to-understand visual explanations that make learning fun and engaging. use bright colors, clean layouts, and simple visual metaphors. break down complex concepts into digestible visual elements. ensure all educational content is accurate, age-appropriate, and visually memorable. include helpful labels or visual cues where appropriate",

  explore:
    "you are a creative exploration assistant with boundless imagination. take the input and transform it into something magical, surprising, and delightful. push creative boundaries while maintaining visual coherence. embrace unexpected combinations, fantastical elements, and whimsical transformations. create images that spark wonder and curiosity",
};

/**
 * Generates a complete prompt by combining the system prompt with the user's prompt.
 * The system prompt is prepended to ensure consistent behavior across all nano-banana generations.
 *
 * @param userPrompt - The user's specific prompt for image generation
 * @returns A complete prompt that includes both system instructions and user input
 */
export function generateSystemPrompt(userPrompt: string): string {
  if (!userPrompt || typeof userPrompt !== "string") {
    return DEFAULT_SYSTEM_PROMPT;
  }

  // Combine system prompt with user prompt, ensuring proper separation
  return `${DEFAULT_SYSTEM_PROMPT}. ${userPrompt}`;
}

/**
 * Generates a workflow-specific prompt by combining the appropriate workflow
 * system prompt with the user's input.
 *
 * @param workflow - The selected workflow type (draw, learn, explore)
 * @param userPrompt - The user's specific prompt for image generation
 * @returns A complete prompt tailored to the workflow with user input
 */
export function generateWorkflowPrompt(
  workflow: WorkflowType,
  userPrompt: string
): string {
  const workflowSystemPrompt = WORKFLOW_SYSTEM_PROMPTS[workflow];

  if (!userPrompt || typeof userPrompt !== "string") {
    return workflowSystemPrompt;
  }

  // Combine workflow-specific system prompt with user prompt
  return `${workflowSystemPrompt}. ${userPrompt}`;
}

/**
 * Validates that a prompt contains the required system prompt components.
 * Useful for testing and debugging.
 *
 * @param prompt - The complete prompt to validate
 * @returns true if the prompt contains the system prompt, false otherwise
 */
export function validateSystemPrompt(prompt: string): boolean {
  return prompt.startsWith(DEFAULT_SYSTEM_PROMPT);
}

/**
 * Validates that a prompt contains a workflow-specific system prompt.
 *
 * @param prompt - The complete prompt to validate
 * @param workflow - The expected workflow type
 * @returns true if the prompt starts with the workflow system prompt
 */
export function validateWorkflowPrompt(
  prompt: string,
  workflow: WorkflowType
): boolean {
  return prompt.startsWith(WORKFLOW_SYSTEM_PROMPTS[workflow]);
}

/**
 * Gets the raw system prompt for a specific workflow type.
 * Useful for debugging or displaying prompt information.
 *
 * @param workflow - The workflow type
 * @returns The system prompt for that workflow
 */
export function getWorkflowSystemPrompt(workflow: WorkflowType): string {
  return WORKFLOW_SYSTEM_PROMPTS[workflow];
}
