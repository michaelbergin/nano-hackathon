/**
 * API request and response type definitions
 * Consolidated from various API routes
 */

import type { WorkflowType } from "./workflow";

// Nano Banana API
export interface NanoBananaRequest {
  prompt: string;
  images?: string[];
  workflow?: WorkflowType;
}

export interface NanoBananaResponse {
  ok: boolean;
  image?: string;
  error?: string;
  raw?: unknown;
}

// Projects API
export interface ProjectCreateRequest {
  name: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  data?: string;
  screenshotUrl?: string;
}

export interface ProjectResponse {
  ok: boolean;
  project?: {
    id: number;
    name: string;
    data: string | null;
    screenshotUrl: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export interface ProjectListResponse {
  ok: boolean;
  projects?: Array<{
    id: number;
    name: string;
    screenshotUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  error?: string;
}

// Prompts API
export interface PromptCreateRequest {
  title: string;
  prompt: string;
}

export interface PromptUpdateRequest {
  title?: string;
  prompt?: string;
}

export interface PromptResponse {
  ok: boolean;
  prompt?: {
    id: number;
    title: string;
    prompt: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export interface PromptListResponse {
  ok: boolean;
  prompts?: Array<{
    id: number;
    title: string;
    prompt: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  error?: string;
}

// Generic API response
export interface ApiErrorResponse {
  ok: false;
  error: string;
}

export interface ApiSuccessResponse {
  ok: true;
}
