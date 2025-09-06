"use client";

import type { JSX, ChangeEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  Pencil,
  Eraser,
  Palette,
  Trash2,
  RotateCcw,
  Camera,
  Download,
  Upload,
  Plus,
  Eye,
  EyeOff,
  X,
  Banana,
  Layers,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Point2 = [number, number];
export type PolyLine2 = number[];
export type PathStroke = {
  points: PolyLine2;
  color: string;
  size: number;
  erase: boolean;
};

export type BaseLayer = {
  id: string;
  name: string;
  visible: boolean;
};

export type VectorLayer = BaseLayer & {
  type: "vector";
  strokes: PathStroke[];
};

export type ImageLayer = BaseLayer & {
  type: "image";
  imageSrc: string;
  banana?: boolean;
};

export type Layer = VectorLayer | ImageLayer;

export type BoardMode = "draw" | "erase";

export type BoardState = {
  layers: Layer[];
  activeLayerId: string;
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  compositeDataUrl: string | null;
};

export type BoardAction =
  | { type: "ADD_LAYER"; name?: string }
  | { type: "REMOVE_LAYER"; id: string }
  | { type: "SELECT_LAYER"; id: string }
  | { type: "TOGGLE_LAYER_VISIBILITY"; id: string }
  | { type: "RENAME_LAYER"; id: string; name: string }
  | { type: "ADD_STROKE_TO_ACTIVE"; stroke: PathStroke }
  | {
      type: "ADD_IMAGE_LAYER_TOP";
      name?: string;
      imageSrc: string;
      banana?: boolean;
    }
  | { type: "ENSURE_ACTIVE_VECTOR_LAYER" }
  | { type: "CLEAR_ACTIVE_LAYER" }
  | { type: "CLEAR_ALL_LAYERS" }
  | { type: "SET_MODE"; mode: BoardMode }
  | { type: "SET_COLOR"; color: string }
  | { type: "SET_BRUSH_SIZE"; size: number }
  | { type: "LOAD_FROM_DATA"; layers: Layer[] }
  | { type: "SET_COMPOSITE"; dataUrl: string | null };

interface CanvasBoardProps {
  initialData?: string;
  onSave?: (data: string) => void;
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createLayer(name: string): VectorLayer {
  return {
    id: generateLayerId(),
    name,
    visible: true,
    type: "vector",
    strokes: [],
  };
}

function ensureActiveLayerId(layers: Layer[], currentId: string): string {
  const has = layers.some((l) => l.id === currentId);
  if (has && layers.length > 0) {
    return currentId;
  }
  return layers.length > 0 ? layers[0].id : generateLayerId();
}

/**
 * Reducer for canvas board state. Logs key transitions to aid debugging.
 */
export function boardReducer(
  state: BoardState,
  action: BoardAction
): BoardState {
  const log = (message: string, extra?: unknown): void => {
    if (typeof window !== "undefined") {
      console.debug(`[CanvasBoard] ${message}`, extra ?? "");
    }
  };
  switch (action.type) {
    case "ADD_LAYER": {
      const name = action.name ?? `Layer ${state.layers.length + 1}`;
      const nextLayer = createLayer(name);
      const next = {
        ...state,
        layers: [...state.layers, nextLayer],
        activeLayerId: nextLayer.id,
      };
      log("ADD_LAYER", {
        active: next.activeLayerId,
        layers: next.layers.map((l) => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
        })),
      });
      return next;
    }
    case "ADD_IMAGE_LAYER_TOP": {
      const name = action.name ?? `Layer ${state.layers.length + 1}`;
      const imageLayer: ImageLayer = {
        id: generateLayerId(),
        name,
        visible: true,
        type: "image",
        imageSrc: action.imageSrc,
        banana: action.banana ?? false,
      };
      const next = {
        ...state,
        layers: [...state.layers, imageLayer],
        activeLayerId: imageLayer.id,
      };
      log("ADD_IMAGE_LAYER_TOP", {
        active: next.activeLayerId,
        layers: next.layers.map((l) => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
        })),
      });
      return next;
    }
    case "REMOVE_LAYER": {
      const remaining = state.layers.filter((l) => l.id !== action.id);
      const nextLayers =
        remaining.length > 0 ? remaining : [createLayer("Layer 1")];
      const nextActive = ensureActiveLayerId(
        nextLayers,
        state.activeLayerId === action.id ? "" : state.activeLayerId
      );
      const next = { ...state, layers: nextLayers, activeLayerId: nextActive };
      log("REMOVE_LAYER", {
        removed: action.id,
        active: next.activeLayerId,
        layers: next.layers.map((l) => ({
          id: l.id,
          type: l.type,
          visible: l.visible,
        })),
      });
      return next;
    }
    case "SELECT_LAYER": {
      // Ensure selected layer is visible
      const nextLayers = state.layers.map((l) =>
        l.id === action.id ? { ...l, visible: true } : l
      );
      const next = { ...state, layers: nextLayers, activeLayerId: action.id };
      log("SELECT_LAYER", { active: next.activeLayerId });
      return next;
    }
    case "TOGGLE_LAYER_VISIBILITY": {
      const next = {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, visible: !l.visible } : l
        ),
      };
      log("TOGGLE_LAYER_VISIBILITY", {
        id: action.id,
        nowVisible:
          next.layers.find((l) => l.id === action.id)?.visible ?? false,
      });
      return next;
    }
    case "RENAME_LAYER": {
      const next = {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, name: action.name } : l
        ),
      };
      log("RENAME_LAYER", { id: action.id, name: action.name });
      return next;
    }
    case "ADD_STROKE_TO_ACTIVE": {
      const idx = state.layers.findIndex((l) => l.id === state.activeLayerId);
      if (idx === -1) {
        return state;
      }
      const target = state.layers[idx];
      if (target.type !== "vector") {
        return state;
      }
      const updated: VectorLayer = {
        ...target,
        strokes: [...target.strokes, action.stroke],
      };
      const nextLayers = state.layers.slice();
      nextLayers[idx] = updated;
      const next = { ...state, layers: nextLayers };
      log("ADD_STROKE_TO_ACTIVE", {
        active: next.activeLayerId,
        strokePoints: action.stroke.points.length,
      });
      return next;
    }
    case "ENSURE_ACTIVE_VECTOR_LAYER": {
      const currentIndex = state.layers.findIndex(
        (l) => l.id === state.activeLayerId
      );
      const current =
        currentIndex >= 0 ? state.layers[currentIndex] : undefined;
      if (current && current.type === "vector") {
        return state;
      }
      const nextLayer = createLayer(`Layer ${state.layers.length + 1}`);
      const next = {
        ...state,
        layers: [...state.layers, nextLayer],
        activeLayerId: nextLayer.id,
      };
      log("ENSURE_ACTIVE_VECTOR_LAYER", { active: next.activeLayerId });
      return next;
    }
    case "CLEAR_ACTIVE_LAYER": {
      const nextLayers = state.layers.map((l) => {
        if (l.id !== state.activeLayerId) {
          return l;
        }
        if (l.type === "vector") {
          return { ...l, strokes: [] };
        }
        return l;
      });
      const next = { ...state, layers: nextLayers };
      log("CLEAR_ACTIVE_LAYER", { active: next.activeLayerId });
      return next;
    }
    case "CLEAR_ALL_LAYERS": {
      const next = {
        ...state,
        layers: state.layers.map((l) =>
          l.type === "vector" ? { ...l, strokes: [] } : l
        ),
      };
      log("CLEAR_ALL_LAYERS");
      return next;
    }
    case "SET_MODE": {
      const next = { ...state, mode: action.mode };
      log("SET_MODE", { mode: next.mode });
      return next;
    }
    case "SET_COLOR": {
      const next = { ...state, strokeColor: action.color };
      log("SET_COLOR", { color: next.strokeColor });
      return next;
    }
    case "SET_BRUSH_SIZE": {
      const next = { ...state, brushSize: action.size };
      log("SET_BRUSH_SIZE", { size: next.brushSize });
      return next;
    }
    case "LOAD_FROM_DATA": {
      const layers =
        action.layers.length > 0 ? action.layers : [createLayer("Layer 1")];
      const next = {
        ...state,
        layers,
        activeLayerId: layers[0].id,
      };
      log("LOAD_FROM_DATA", {
        active: next.activeLayerId,
        count: layers.length,
      });
      return next;
    }
    case "SET_COMPOSITE": {
      const next = { ...state, compositeDataUrl: action.dataUrl };
      log("SET_COMPOSITE", { hasData: Boolean(next.compositeDataUrl) });
      return next;
    }
    default: {
      return state;
    }
  }
}

function drawPathOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: PathStroke
): void {
  const polyline = stroke.points;
  if (polyline.length < 4) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = stroke.erase
    ? "destination-out"
    : "source-over";
  ctx.lineWidth = stroke.size;
  ctx.strokeStyle = stroke.color;
  ctx.beginPath();
  ctx.moveTo(polyline[0], polyline[1]);
  for (let i = 2; i < polyline.length; i += 2) {
    ctx.lineTo(polyline[i], polyline[i + 1]);
  }
  ctx.stroke();
  ctx.restore();
}

export function getCanvasScreenshot(
  layers: Layer[],
  width: number,
  height: number,
  dprInput?: number
): string {
  const dpr = Math.max(
    1,
    Math.floor(
      dprInput ??
        (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    )
  );
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width * dpr));
  off.height = Math.max(1, Math.floor(height * dpr));
  const ctx = off.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    if (layer.type === "vector") {
      for (const stroke of layer.strokes) {
        drawPathOnContext(ctx, stroke);
      }
    }
  }
  return off.toDataURL("image/png");
}

async function getCanvasScreenshotAsync(
  layers: Layer[],
  width: number,
  height: number,
  dprInput?: number
): Promise<string> {
  const dpr = Math.max(
    1,
    Math.floor(
      dprInput ??
        (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    )
  );
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width * dpr));
  off.height = Math.max(1, Math.floor(height * dpr));
  const ctx = off.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    if (layer.type === "image") {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = layer.imageSrc;
      await img.decode().catch(() => undefined);
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      for (const stroke of layer.strokes) {
        drawPathOnContext(ctx, stroke);
      }
    }
  }
  return off.toDataURL("image/png");
}

export function CanvasBoard({
  initialData,
  onSave,
}: CanvasBoardProps = {}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(
    new Map<string, HTMLImageElement>()
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const currentPathRef = useRef<PathStroke | null>(null);

  const [state, dispatch] = useReducer(boardReducer, {
    layers: [createLayer("Layer 1")],
    activeLayerId: "",
    mode: "draw",
    strokeColor: "#111827",
    brushSize: 4,
    compositeDataUrl: null,
  });

  // Ensure activeLayerId is set to first layer on mount
  useEffect(() => {
    if (!state.activeLayerId && state.layers.length > 0) {
      dispatch({ type: "SELECT_LAYER", id: state.layers[0].id });
    }
  }, [state.activeLayerId, state.layers]);

  // Load initial data (supports legacy flat strokes array or layered schema)
  useEffect(() => {
    if (!initialData) {
      return;
    }
    try {
      const parsed = JSON.parse(initialData) as unknown;
      if (Array.isArray(parsed)) {
        // Legacy: flat strokes -> single layer
        const layer = createLayer("Layer 1");
        layer.strokes = parsed as PathStroke[];
        dispatch({ type: "LOAD_FROM_DATA", layers: [layer] });
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "layers" in (parsed as Record<string, unknown>)
      ) {
        const maybe = (parsed as { layers: unknown }).layers;
        if (Array.isArray(maybe)) {
          const layers: Layer[] = maybe
            .map((l) => {
              const obj = l as Partial<
                Layer & { type?: string; imageSrc?: string }
              >;
              if (!obj || typeof obj !== "object") {
                return null;
              }
              const id =
                typeof obj.id === "string" ? obj.id : generateLayerId();
              const name =
                typeof (obj as BaseLayer).name === "string"
                  ? (obj as BaseLayer).name
                  : "Layer";
              const visible =
                typeof (obj as BaseLayer).visible === "boolean"
                  ? (obj as BaseLayer).visible
                  : true;
              if (
                (obj as ImageLayer).type === "image" &&
                typeof (obj as ImageLayer).imageSrc === "string"
              ) {
                return {
                  id,
                  name,
                  visible,
                  type: "image",
                  imageSrc: (obj as ImageLayer).imageSrc,
                  banana: (obj as ImageLayer).banana ?? false,
                } as ImageLayer;
              }
              const strokes = Array.isArray((obj as VectorLayer).strokes)
                ? ((obj as VectorLayer).strokes as PathStroke[])
                : [];
              return {
                id,
                name,
                visible,
                type: "vector",
                strokes,
              } as VectorLayer;
            })
            .filter((x): x is Layer => x !== null);
          dispatch({ type: "LOAD_FROM_DATA", layers });
        }
      }
    } catch (err) {
      console.error("Failed to parse initial canvas data:", err);
    }
  }, [initialData]);

  // Save data when layers change
  useEffect(() => {
    if (!onSave) {
      return;
    }
    const payload = { layers: state.layers };
    try {
      const data = JSON.stringify(payload);
      onSave(data);
    } catch {
      // ignore
    }
  }, [state.layers, onSave]);

  const drawPath = useCallback((stroke: PathStroke): void => {
    const ctx = ctxRef.current;
    if (!ctx) {
      return;
    }
    drawPathOnContext(ctx, stroke);
  }, []);

  const drawAll = useCallback((): void => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of state.layers) {
      if (!layer.visible) {
        continue;
      }
      if (layer.type === "image") {
        const cached = imageCacheRef.current.get(layer.imageSrc) ?? null;
        if (cached) {
          // Draw images preserving aspect ratio and centering them
          const m = ctx.getTransform();
          const scaleX = m.a || 1;
          const scaleY = m.d || 1;
          const cssW = canvas.width / scaleX;
          const cssH = canvas.height / scaleY;

          // Calculate aspect ratios
          const imageAspectRatio = cached.width / cached.height;
          const canvasAspectRatio = cssW / cssH;

          let drawWidth: number;
          let drawHeight: number;
          let drawX: number;
          let drawY: number;

          // Determine dimensions while preserving aspect ratio
          if (imageAspectRatio > canvasAspectRatio) {
            // Image is wider than canvas - fit by width
            drawWidth = cssW;
            drawHeight = cssW / imageAspectRatio;
            drawX = 0;
            drawY = (cssH - drawHeight) / 2; // Center vertically
          } else {
            // Image is taller than canvas - fit by height
            drawHeight = cssH;
            drawWidth = cssH * imageAspectRatio;
            drawX = (cssW - drawWidth) / 2; // Center horizontally
            drawY = 0;
          }

          ctx.drawImage(cached, drawX, drawY, drawWidth, drawHeight);
        }
      } else {
        for (const s of layer.strokes) {
          drawPath(s);
        }
      }
    }
    const current = currentPathRef.current;
    if (current) {
      drawPath(current);
    }
  }, [state.layers, drawPath]);

  const resizeCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${Math.max(1, Math.floor(rect.width))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(rect.height))}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = state.brushSize;
    ctx.strokeStyle = state.strokeColor;
    ctxRef.current = ctx;
    drawAll();
  }, [state.brushSize, state.strokeColor, drawAll]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Ensure an image is loaded and cached. Triggers redraw on load.
  const ensureImageLoaded = useCallback(
    (src: string): void => {
      if (imageCacheRef.current.has(src)) {
        return;
      }
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        drawAll();
      };
      img.onerror = () => {
        // Do not retry automatically; leave uncached on error
      };
      img.src = src;
    },
    [drawAll]
  );

  const getRelativePoint = useCallback((evt: PointerEvent): Point2 => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return [0, 0];
    }
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return [x, y];
  }, []);

  useEffect(() => {
    drawAll();
  }, [state.layers, drawAll]);

  // Preload images for visible image layers so they persist during interactions
  useEffect(() => {
    for (const layer of state.layers) {
      if (layer.type === "image" && layer.visible) {
        ensureImageLoaded(layer.imageSrc);
      }
    }
  }, [state.layers, ensureImageLoaded]);

  const onPointerDown = useCallback(
    (evt: PointerEvent): void => {
      // Only draw with primary pointer, and only for pen or mouse (ignore fingers)
      if (!evt.isPrimary) {
        return;
      }
      if (evt.pointerType !== "mouse" && evt.pointerType !== "pen") {
        return;
      }
      if (evt.button !== 0) {
        return;
      }
      (evt.target as Element).setPointerCapture?.(evt.pointerId);
      // Ensure we always draw on a vector layer (auto-create one if active is image)
      dispatch({ type: "ENSURE_ACTIVE_VECTOR_LAYER" });
      isDrawingRef.current = true;
      const [x, y] = getRelativePoint(evt);
      const start: PathStroke = {
        points: [x, y, x, y],
        color: state.strokeColor,
        size: state.brushSize,
        erase: state.mode === "erase",
      };
      currentPathRef.current = start;
      drawAll();
    },
    [getRelativePoint, drawAll, state.strokeColor, state.brushSize, state.mode]
  );

  const onPointerMove = useCallback(
    (evt: PointerEvent): void => {
      if (!isDrawingRef.current) {
        return;
      }
      if (!evt.isPrimary) {
        return;
      }
      const curr = currentPathRef.current;
      if (!curr) {
        return;
      }

      // Prefer coalesced events for smoother Apple Pencil input when available
      const coalesced = (evt.getCoalescedEvents?.() ?? []) as PointerEvent[];
      if (coalesced.length > 0) {
        let points = curr.points;
        for (const pe of coalesced) {
          const [cx, cy] = getRelativePoint(pe);
          points = [...points, cx, cy];
        }
        currentPathRef.current = { ...curr, points };
      } else {
        const [x, y] = getRelativePoint(evt);
        currentPathRef.current = { ...curr, points: [...curr.points, x, y] };
      }
      drawAll();
    },
    [getRelativePoint, drawAll]
  );

  const onPointerUp = useCallback((evt: PointerEvent): void => {
    if (!isDrawingRef.current) {
      return;
    }
    (evt.target as Element).releasePointerCapture?.(evt.pointerId);
    isDrawingRef.current = false;
    const finished = currentPathRef.current;
    currentPathRef.current = null;
    if (finished && finished.points.length >= 4) {
      dispatch({
        type: "ADD_STROKE_TO_ACTIVE",
        stroke: { ...finished, points: [...finished.points] },
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const down = (e: Event): void => onPointerDown(e as PointerEvent);
    const move = (e: Event): void => onPointerMove(e as PointerEvent);
    const up = (e: Event): void => onPointerUp(e as PointerEvent);
    const cancel = (e: Event): void => {
      const evt = e as PointerEvent;
      (evt.target as Element | null)?.releasePointerCapture?.(evt.pointerId);
      isDrawingRef.current = false;
      currentPathRef.current = null;
    };
    const lostCapture = (e: Event): void => onPointerUp(e as PointerEvent);
    const preventContext = (e: Event): void => {
      e.preventDefault();
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel, { passive: false });
    canvas.addEventListener("lostpointercapture", lostCapture);
    canvas.addEventListener("contextmenu", preventContext, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      canvas.removeEventListener("contextmenu", preventContext);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  const onClearActive = useCallback((): void => {
    dispatch({ type: "CLEAR_ACTIVE_LAYER" });
    currentPathRef.current = null;
    drawAll();
  }, [drawAll]);

  const onClearAll = useCallback((): void => {
    dispatch({ type: "CLEAR_ALL_LAYERS" });
    currentPathRef.current = null;
    drawAll();
  }, [drawAll]);

  const onColorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      dispatch({ type: "SET_COLOR", color: e.target.value });
    },
    []
  );

  const onSizeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const next = Number(e.target.value);
      const clamped = Number.isFinite(next)
        ? Math.max(1, Math.min(24, next))
        : 4;
      dispatch({ type: "SET_BRUSH_SIZE", size: clamped });
      resizeCanvas();
    },
    [resizeCanvas]
  );

  const onAddLayer = useCallback((): void => {
    dispatch({ type: "ADD_LAYER" });
  }, []);

  const onRemoveLayer = useCallback((id: string): void => {
    dispatch({ type: "REMOVE_LAYER", id });
  }, []);

  const onSelectLayer = useCallback((id: string): void => {
    dispatch({ type: "SELECT_LAYER", id });
  }, []);

  const onToggleLayer = useCallback((id: string): void => {
    dispatch({ type: "TOGGLE_LAYER_VISIBILITY", id });
  }, []);

  const onSetModeDraw = useCallback((): void => {
    dispatch({ type: "SET_MODE", mode: "draw" });
  }, []);

  const onSetModeErase = useCallback((): void => {
    dispatch({ type: "SET_MODE", mode: "erase" });
  }, []);

  const captureScreenshot = useCallback((): void => {
    const container = containerRef.current;
    if (!container) {
      dispatch({ type: "SET_COMPOSITE", dataUrl: null });
      return;
    }
    const rect = container.getBoundingClientRect();
    const visibleLayers = state.layers.filter((l) => l.visible);
    (async () => {
      const dataUrl = await getCanvasScreenshotAsync(
        visibleLayers,
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height))
      );
      dispatch({ type: "SET_COMPOSITE", dataUrl });
    })();
  }, [state.layers]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [bananaPrompt, setBananaPrompt] = useState<string>("banana-fy");

  const downloadComposite = useCallback(async (): Promise<void> => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const visibleLayers = state.layers.filter((l) => l.visible);
    const dataUrl = await getCanvasScreenshotAsync(
      visibleLayers,
      Math.max(1, Math.floor(rect.width)),
      Math.max(1, Math.floor(rect.height))
    );
    if (!dataUrl) {
      return;
    }
    const a = document.createElement("a");
    const ts = new Date();
    const yyyy = ts.getFullYear().toString();
    const mm = String(ts.getMonth() + 1).padStart(2, "0");
    const dd = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const nn = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    a.href = dataUrl;
    a.download = `canvas-${yyyy}${mm}${dd}-${hh}${nn}${ss}.png`;
    a.click();
  }, [state.layers]);

  const uploadToCloudinary = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const form = new FormData();
        form.append("file", file);
        if (uploadPreset) {
          form.append("upload_preset", uploadPreset);
          const res = await fetch(
            "https://api.cloudinary.com/v1_1/dqyx4lyxn/image/upload",
            {
              method: "POST",
              body: form,
            }
          );
          const json = (await res.json()) as unknown;
          if (
            json &&
            typeof json === "object" &&
            "secure_url" in (json as Record<string, unknown>) &&
            typeof (json as { secure_url?: unknown }).secure_url === "string"
          ) {
            return (json as { secure_url: string }).secure_url;
          }
          return null;
        }
        const signRes = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            params: { timestamp: Math.floor(Date.now() / 1000) },
          }),
        });
        const signJson = (await signRes.json()) as {
          ok?: boolean;
          signature?: string;
          params?: Record<string, string>;
          cloudName?: string;
        };
        if (
          !signJson?.ok ||
          !signJson.signature ||
          !signJson.params ||
          !signJson.cloudName
        ) {
          return null;
        }
        for (const [k, v] of Object.entries(signJson.params)) {
          form.append(k, v);
        }
        form.append("signature", signJson.signature);
        form.append("api_key", "598646243146163");
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${signJson.cloudName}/image/upload`,
          {
            method: "POST",
            body: form,
          }
        );
        const json = (await res.json()) as unknown;
        if (
          json &&
          typeof json === "object" &&
          "secure_url" in (json as Record<string, unknown>) &&
          typeof (json as { secure_url?: unknown }).secure_url === "string"
        ) {
          return (json as { secure_url: string }).secure_url;
        }
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  const onOpenUpload = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file =
        e.target.files && e.target.files[0] ? e.target.files[0] : null;
      e.target.value = "";
      if (!file) {
        return;
      }
      let imageSrc: string | null = null;
      imageSrc = await uploadToCloudinary(file);
      if (!imageSrc) {
        imageSrc = URL.createObjectURL(file);
      }
      dispatch({
        type: "ADD_IMAGE_LAYER_TOP",
        name: file.name || "Image Layer",
        imageSrc,
      });
    },
    [uploadToCloudinary]
  );

  const onGenerateBanana = useCallback(async (): Promise<void> => {
    if (isGenerating) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    setIsGenerating(true);
    try {
      const rect = container.getBoundingClientRect();
      const visibleLayers = state.layers.filter((l) => l.visible);
      const composite = await getCanvasScreenshotAsync(
        visibleLayers,
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height))
      );
      const res = await fetch("/api/nano-banana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: bananaPrompt, images: [composite] }),
      });
      const json = (await res.json()) as { ok?: boolean; image?: string };
      if (json?.ok && typeof json.image === "string" && json.image) {
        dispatch({
          type: "ADD_IMAGE_LAYER_TOP",
          name: "Banana Layer",
          imageSrc: json.image,
          banana: true,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, state.layers, bananaPrompt]);

  const drawActive = state.mode === "draw";
  const activeLayerId = state.activeLayerId;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair select-none touch-none"
        />
      </div>

      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Tools Card */}
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-2">
                <Button
                  variant={drawActive ? "default" : "outline"}
                  size="sm"
                  onClick={onSetModeDraw}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Draw
                </Button>
                <Button
                  variant={!drawActive ? "default" : "outline"}
                  size="sm"
                  onClick={onSetModeErase}
                  className="flex-1"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Erase
                </Button>
              </div>

              {/* Brush Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Color</Label>
                  <Input
                    type="color"
                    value={state.strokeColor}
                    onChange={onColorChange}
                    className="h-8 w-12 p-1 border rounded"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: state.strokeColor }}
                    />
                  </div>
                  <Label className="text-sm font-medium flex-1">Size</Label>
                  <div className="flex items-center gap-2 min-w-0">
                    <Input
                      type="range"
                      min={1}
                      max={24}
                      value={state.brushSize}
                      onChange={onSizeChange}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {state.brushSize}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearActive}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Active
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureScreenshot}
                  className="text-xs"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Screenshot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void downloadComposite();
                  }}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>

              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e): void => {
                    void onFileSelected(e);
                  }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenUpload}
                  className="w-full text-xs"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Upload Image
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Layers Card */}
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-2">
                {state.layers.map((layer) => {
                  const isActive = layer.id === activeLayerId;
                  return (
                    <div
                      key={layer.id}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                        isActive
                          ? "bg-primary/10 border-primary/20"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onSelectLayer(layer.id)}
                        className="flex-1 justify-start text-left h-8 px-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isActive
                                ? "bg-primary-foreground"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <span className="truncate text-sm">{layer.name}</span>
                          {layer.type === "image" && (
                            <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          )}
                          {(layer as ImageLayer).banana && (
                            <Banana className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleLayer(layer.id)}
                        className="h-8 w-8 p-0"
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveLayer(layer.id)}
                        disabled={state.layers.length <= 1}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete layer"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onAddLayer}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Layer
              </Button>
            </CardContent>
          </Card>

          {/* Banana Generation Card */}
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banana className="h-4 w-4" />
                Banana AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={onGenerateBanana}
                disabled={isGenerating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              >
                <Banana className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating…" : "Generate Banana Layer"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="bananaPrompt" className="text-sm font-medium">
                  Prompt
                </Label>
                <Input
                  id="bananaPrompt"
                  placeholder="banana-fy this image"
                  value={bananaPrompt}
                  onChange={(e) => setBananaPrompt(e.target.value)}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          {state.compositeDataUrl && (
            <Card className="w-80 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.compositeDataUrl}
                  alt="Canvas screenshot"
                  className="w-full h-auto rounded-md border"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
