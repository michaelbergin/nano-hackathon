/**
 * Runtime type guards for safe type narrowing
 * Replaces unsafe `as unknown as` patterns
 */

import type {
  Layer,
  VectorLayer,
  ImageLayer,
  BackgroundLayer,
  PathStroke,
  BoardSnapshot,
} from "@/types/canvas";

// Layer type guards
export function isLayer(obj: unknown): obj is Layer {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "type" in obj &&
    "name" in obj &&
    "visible" in obj &&
    typeof (obj as Layer).id === "string" &&
    typeof (obj as Layer).name === "string" &&
    typeof (obj as Layer).visible === "boolean"
  );
}

export function isVectorLayer(layer: Layer): layer is VectorLayer {
  return layer.type === "vector";
}

export function isImageLayer(layer: Layer): layer is ImageLayer {
  return layer.type === "image";
}

export function isBackgroundLayer(layer: Layer): layer is BackgroundLayer {
  return layer.type === "background";
}

// Stroke type guard
export function isPathStroke(obj: unknown): obj is PathStroke {
  if (typeof obj !== "object" || obj === null) return false;
  const stroke = obj as Partial<PathStroke>;
  return (
    Array.isArray(stroke.points) &&
    typeof stroke.color === "string" &&
    typeof stroke.size === "number" &&
    typeof stroke.erase === "boolean"
  );
}

// Canvas data type guards
export function isCanvasData(
  obj: unknown
): obj is { layers: Layer[]; activeLayerId?: string } {
  if (typeof obj !== "object" || obj === null) return false;
  const data = obj as Record<string, unknown>;
  return Array.isArray(data.layers);
}

export function isBoardSnapshot(obj: unknown): obj is BoardSnapshot {
  if (typeof obj !== "object" || obj === null) return false;
  const data = obj as Record<string, unknown>;
  return (
    Array.isArray(data.layers) && typeof data.activeLayerId === "string"
  );
}

// PointerEvent coalesced events type guard
interface PointerEventWithCoalesced extends PointerEvent {
  getCoalescedEvents: () => PointerEvent[];
}

export function hasCoalescedEvents(
  evt: PointerEvent
): evt is PointerEventWithCoalesced {
  return (
    "getCoalescedEvents" in evt &&
    typeof (evt as PointerEventWithCoalesced).getCoalescedEvents === "function"
  );
}

export function getCoalescedEventsSafe(evt: PointerEvent): PointerEvent[] {
  if (hasCoalescedEvents(evt)) {
    try {
      const events = evt.getCoalescedEvents();
      return Array.isArray(events) ? events : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Speech Recognition type definitions and type guard
interface MinimalSpeechRecognitionEventResultItem {
  transcript: string;
}

interface MinimalSpeechRecognitionEventResult {
  isFinal: boolean;
  0: MinimalSpeechRecognitionEventResultItem;
}

export interface MinimalSpeechRecognitionEvent {
  results: ArrayLike<MinimalSpeechRecognitionEventResult>;
}

export interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type MinimalSpeechRecognitionCtor = new () => MinimalSpeechRecognition;

export function getSpeechRecognitionCtor(): MinimalSpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  // Access window properties safely
  const win = window as Window & {
    SpeechRecognition?: MinimalSpeechRecognitionCtor;
    webkitSpeechRecognition?: MinimalSpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

// JSON parsing helpers
export function parseJsonSafe<T>(
  json: string,
  validator: (obj: unknown) => obj is T
): T | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Object property check helper
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

// Cloudinary response type guard
export interface CloudinaryUploadResponse {
  secure_url: string;
}

export function isCloudinaryResponse(
  obj: unknown
): obj is CloudinaryUploadResponse {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "secure_url" in obj &&
    typeof (obj as CloudinaryUploadResponse).secure_url === "string"
  );
}
