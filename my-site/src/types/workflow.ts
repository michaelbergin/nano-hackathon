/**
 * Workflow type definitions
 * Extracted from WelcomeScreen.tsx and generateSystemPrompt.ts
 */

import type { JSX } from "react";

export type WorkflowType = "draw" | "learn" | "explore";

export interface WorkflowOption {
  key: string;
  label: string;
  icon: JSX.Element;
  defaultPrompt: string;
}

export interface WorkflowConfig {
  type: WorkflowType;
  title: string;
  subtitle: string;
  icon: JSX.Element;
  options: WorkflowOption[];
}

export interface WelcomeScreenProps {
  onSubmit: (workflow: WorkflowType, prompt: string) => void;
}
