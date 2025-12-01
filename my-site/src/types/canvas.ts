/**
 * Canvas type definitions
 * Extracted from CanvasBoard.tsx for better organization
 */

// Primitives
export type Point2 = [number, number];
export type PolyLine2 = number[];

// Strokes
export type PathStroke = {
  points: PolyLine2;
  color: string;
  size: number;
  erase: boolean;
};

// Layers (discriminated union)
export type BaseLayer = {
  id: string;
  name: string;
  visible: boolean;
};

export type VectorLayer = BaseLayer & {
  type: "vector";
  strokes: PathStroke[];
  offsetX?: number;
  offsetY?: number;
};

export type ImageLayer = BaseLayer & {
  type: "image";
  imageSrc: string;
  banana?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type BackgroundLayer = BaseLayer & {
  type: "background";
  color: string;
};

export type Layer = VectorLayer | ImageLayer | BackgroundLayer;

// State
export type BoardMode = "draw" | "erase" | "move";

export type BoardSnapshot = {
  layers: Layer[];
  activeLayerId: string;
};

export type BoardState = {
  layers: Layer[];
  activeLayerId: string;
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  compositeDataUrl: string | null;
  past: BoardSnapshot[];
  future: BoardSnapshot[];
};

// Actions (discriminated union)
export type BoardAction =
  | { type: "ADD_LAYER"; name?: string }
  | { type: "REMOVE_LAYER"; id: string }
  | { type: "SELECT_LAYER"; id: string }
  | { type: "TOGGLE_LAYER_VISIBILITY"; id: string }
  | { type: "CLEAR_LAYER"; id: string }
  | { type: "RENAME_LAYER"; id: string; name: string }
  | { type: "REORDER_LAYERS"; order: string[] }
  | { type: "ADD_STROKE_TO_ACTIVE"; stroke: PathStroke }
  | { type: "ADD_IMAGE_LAYER_TOP"; name?: string; imageSrc: string; banana?: boolean }
  | { type: "MOVE_LAYER"; id: string; dx: number; dy: number }
  | { type: "SET_IMAGE_BOUNDS"; id: string; x: number; y: number; width: number; height: number }
  | { type: "SET_BACKGROUND_COLOR"; id: string; color: string }
  | { type: "ENSURE_ACTIVE_VECTOR_LAYER" }
  | { type: "CLEAR_ACTIVE_LAYER" }
  | { type: "CLEAR_ALL_LAYERS" }
  | { type: "SET_MODE"; mode: BoardMode }
  | { type: "SET_COLOR"; color: string }
  | { type: "SET_BRUSH_SIZE"; size: number }
  | { type: "LOAD_FROM_DATA"; layers: Layer[] }
  | { type: "SET_COMPOSITE"; dataUrl: string | null }
  | { type: "UNDO" }
  | { type: "REDO" };

// Utility types
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
