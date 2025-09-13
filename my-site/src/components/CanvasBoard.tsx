"use client";

import type { JSX, ChangeEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import CanvasBoardControls from "./CanvasBoardControls";
import {
  createLayer,
  createBackgroundLayer,
  drawPathOnContext,
  generateLayerId,
  getCanvasScreenshotAsync,
} from "./canvasUtils";
import { boardReducer } from "./canvasBoardReducer";
// UI components integrated with CanvasBoardControls

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
  // optional offset in CSS pixels; defaults to 0 when undefined
  offsetX?: number;
  offsetY?: number;
};

export type ImageLayer = BaseLayer & {
  type: "image";
  imageSrc: string;
  banana?: boolean;
  // optional placement rect in CSS pixels; if missing, image is aspect-fit
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

export type BoardMode = "draw" | "erase" | "move";

export type BoardSnapshot = { layers: Layer[]; activeLayerId: string };
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

export type BoardAction =
  | { type: "ADD_LAYER"; name?: string }
  | { type: "REMOVE_LAYER"; id: string }
  | { type: "SELECT_LAYER"; id: string }
  | { type: "TOGGLE_LAYER_VISIBILITY"; id: string }
  | { type: "CLEAR_LAYER"; id: string }
  | { type: "RENAME_LAYER"; id: string; name: string }
  | { type: "REORDER_LAYERS"; order: string[] }
  | { type: "ADD_STROKE_TO_ACTIVE"; stroke: PathStroke }
  | {
      type: "ADD_IMAGE_LAYER_TOP";
      name?: string;
      imageSrc: string;
      banana?: boolean;
    }
  | { type: "MOVE_LAYER"; id: string; dx: number; dy: number }
  | {
      type: "SET_IMAGE_BOUNDS";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
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

function getCoalescedEventsSafe(evt: PointerEvent): PointerEvent[] {
  const candidate = evt as unknown as {
    getCoalescedEvents?: () => PointerEvent[];
  };
  if (typeof candidate.getCoalescedEvents === "function") {
    try {
      const events = candidate.getCoalescedEvents();
      return Array.isArray(events) ? events : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Props for CanvasBoard.
 * onScreenshot: optional callback invoked with a PNG data URL whenever a screenshot is explicitly captured
 * (via the Screenshot action) or when generation runs and a composite is produced.
 */
interface CanvasBoardProps {
  initialData?: string;
  onSave?: (data: string) => void;
  onScreenshot?: (dataUrl: string) => void | Promise<void>;
}

// Target frame rate for canvas redraws
const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;

export function CanvasBoard({
  initialData,
  onSave,
  onScreenshot,
}: CanvasBoardProps = {}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(
    new Map<string, HTMLImageElement>()
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // UI-only collapse state for controls panels
  const [panelsCollapsed, setPanelsCollapsed] = useState<{
    tools: boolean;
    actions: boolean;
    layers: boolean;
    banana: boolean;
  }>({ tools: false, actions: false, layers: false, banana: false });

  // Render scheduling (30fps)
  const lastRenderTimeRef = useRef<number>(0);
  const renderRequestedRef = useRef<boolean>(false);

  const isDrawingRef = useRef<boolean>(false);
  const currentPathRef = useRef<PathStroke | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragInfoRef = useRef<{
    id: string;
    lastX: number;
    lastY: number;
    axis?: "x" | "y";
  } | null>(null);
  const [isDraggingUi, setIsDraggingUi] = useState<boolean>(false);

  const [state, dispatch] = useReducer(boardReducer, {
    layers: [createBackgroundLayer("#ffffff"), createLayer("Layer 1")],
    activeLayerId: "",
    mode: "draw",
    strokeColor: "#111827",
    brushSize: 4,
    compositeDataUrl: null,
    past: [],
    future: [],
  });

  // Ensure activeLayerId is set to first non-background layer on mount
  useEffect(() => {
    if (!state.activeLayerId && state.layers.length > 0) {
      const firstDrawable = state.layers.find((l) => l.type !== "background");
      if (firstDrawable) {
        dispatch({ type: "SELECT_LAYER", id: firstDrawable.id });
      } else {
        dispatch({ type: "SELECT_LAYER", id: state.layers[0].id });
      }
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
          const layers: Layer[] = maybe.map((l) => {
            const obj = l as Partial<
              Layer & { type?: string; imageSrc?: string }
            >;
            const id = typeof obj.id === "string" ? obj.id : generateLayerId();
            const name =
              typeof (obj as BaseLayer).name === "string"
                ? (obj as BaseLayer).name
                : "Layer";
            const visible =
              typeof (obj as BaseLayer).visible === "boolean"
                ? (obj as BaseLayer).visible
                : true;
            if ((obj as { type?: string }).type === "background") {
              const colorVal = (obj as { color?: unknown }).color;
              const bg: BackgroundLayer = {
                id,
                name,
                visible,
                type: "background",
                color: typeof colorVal === "string" ? colorVal : "#ffffff",
              };
              return bg;
            } else if (
              obj.type === "image" &&
              typeof (obj as ImageLayer).imageSrc === "string"
            ) {
              const imgObj = obj as ImageLayer;
              return {
                id,
                name,
                visible,
                type: "image",
                imageSrc: imgObj.imageSrc,
                banana: imgObj.banana ?? false,
                x: typeof imgObj.x === "number" ? imgObj.x : undefined,
                y: typeof imgObj.y === "number" ? imgObj.y : undefined,
                width:
                  typeof imgObj.width === "number" ? imgObj.width : undefined,
                height:
                  typeof imgObj.height === "number" ? imgObj.height : undefined,
              } as ImageLayer;
            }
            const strokes = Array.isArray((obj as VectorLayer).strokes)
              ? (obj as VectorLayer).strokes
              : [];
            const vecObj = obj as VectorLayer;
            return {
              id,
              name,
              visible,
              type: "vector",
              strokes,
              offsetX:
                typeof vecObj.offsetX === "number" ? vecObj.offsetX : undefined,
              offsetY:
                typeof vecObj.offsetY === "number" ? vecObj.offsetY : undefined,
            } as VectorLayer;
          });
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

  const getCssSize = useCallback((): { cssW: number; cssH: number } => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { cssW: 0, cssH: 0 };
    }
    // Use layout-based size which is stable across devices and browsers
    const cssW = Math.max(1, Math.floor(canvas.clientWidth));
    const cssH = Math.max(1, Math.floor(canvas.clientHeight));
    return { cssW, cssH };
  }, []);

  // Compute bounding rect for a layer, using image cache for accurate aspect-fit when needed
  const getLayerBoundingRect = useCallback(
    (
      layer: Layer
    ): { x: number; y: number; width: number; height: number } | null => {
      const { cssW, cssH } = getCssSize();
      if (cssW === 0 || cssH === 0) return null;
      if (layer.type === "background") {
        return { x: 0, y: 0, width: cssW, height: cssH };
      }
      if (layer.type === "image") {
        let bx: number;
        let by: number;
        let bw: number;
        let bh: number;
        const { x, y, width, height } = layer;
        if (
          typeof x === "number" &&
          typeof y === "number" &&
          typeof width === "number" &&
          typeof height === "number"
        ) {
          bx = x;
          by = y;
          bw = width;
          bh = height;
          return { x: bx, y: by, width: bw, height: bh };
        }
        const cached = imageCacheRef.current.get(layer.imageSrc) ?? null;
        if (cached) {
          // Banana images always fill the entire canvas
          if (layer.banana) {
            return { x: 0, y: 0, width: cssW, height: cssH };
          }
          // Regular images use aspect-fit
          const imageAspectRatio = cached.width / cached.height;
          const canvasAspectRatio = cssW / cssH;
          if (imageAspectRatio > canvasAspectRatio) {
            bw = cssW;
            bh = cssW / imageAspectRatio;
            bx = 0;
            by = (cssH - bh) / 2;
          } else {
            bh = cssH;
            bw = cssH * imageAspectRatio;
            bx = (cssW - bw) / 2;
            by = 0;
          }
          return { x: bx, y: by, width: bw, height: bh };
        }
        // Fallback: assume full canvas until image loads
        return { x: 0, y: 0, width: cssW, height: cssH };
      }
      if (layer.strokes.length === 0) return null;
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let maxSize = 1;
      for (const s of layer.strokes) {
        maxSize = Math.max(maxSize, s.size);
        const pts = s.points;
        for (let i = 0; i < pts.length; i += 2) {
          const x = pts[i];
          const y = pts[i + 1];
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (
        !isFinite(minX) ||
        !isFinite(minY) ||
        !isFinite(maxX) ||
        !isFinite(maxY)
      ) {
        return null;
      }
      const dx = layer.offsetX ?? 0;
      const dy = layer.offsetY ?? 0;
      const pad = Math.max(4, maxSize / 2 + 2);
      return {
        x: minX + dx - pad,
        y: minY + dy - pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      };
    },
    [getCssSize]
  );

  const hitTestLayers = useCallback(
    (x: number, y: number): number => {
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i];
        if (!l.visible) continue;
        if (l.type === "background") continue;
        const rect = getLayerBoundingRect(l);
        if (!rect) continue;
        if (
          x >= rect.x &&
          x <= rect.x + rect.width &&
          y >= rect.y &&
          y <= rect.y + rect.height
        ) {
          return i;
        }
      }
      return -1;
    },
    [state.layers, getLayerBoundingRect]
  );

  const drawAll = useCallback((): void => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) {
      return;
    }

    // Ensure offscreen canvas exists and matches size/transform
    let off = offscreenRef.current;
    let octx = offscreenCtxRef.current;
    if (!off || !octx) {
      off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      octx = off.getContext("2d");
      if (!octx) {
        return;
      }
      const m = ctx.getTransform();
      octx.setTransform(
        m.a || 1,
        m.b || 0,
        m.c || 0,
        m.d || 1,
        m.e || 0,
        m.f || 0
      );
      octx.lineJoin = "round";
      octx.lineCap = "round";
      offscreenRef.current = off;
      offscreenCtxRef.current = octx;
    }

    // Derive CSS pixel size from transform
    const m = ctx.getTransform();
    const scaleX = m.a || 1;
    const scaleY = m.d || 1;
    const cssW = canvas.width / scaleX;
    const cssH = canvas.height / scaleY;

    // Clear main canvas in CSS pixels (transform applies DPR)
    ctx.clearRect(0, 0, cssW, cssH);

    for (const layer of state.layers) {
      if (!layer.visible) {
        continue;
      }

      // Reset and clear the offscreen layer canvas
      if (off.width !== canvas.width || off.height !== canvas.height) {
        off.width = canvas.width;
        off.height = canvas.height;
        octx.setTransform(
          m.a || 1,
          m.b || 0,
          m.c || 0,
          m.d || 1,
          m.e || 0,
          m.f || 0
        );
        octx.lineJoin = "round";
        octx.lineCap = "round";
      }
      octx.clearRect(0, 0, off.width, off.height);

      if (layer.type === "background") {
        octx.save();
        octx.fillStyle = layer.color;
        octx.fillRect(0, 0, cssW, cssH);
        octx.restore();
      } else if (layer.type === "image") {
        const cached = imageCacheRef.current.get(layer.imageSrc) ?? null;
        if (cached) {
          // Special handling for banana-generated images - cover entire canvas frame
          if (layer.banana) {
            // Calculate "cover" scaling - image fills entire canvas, may crop
            const imageAspectRatio = cached.width / cached.height;
            const canvasAspectRatio = cssW / cssH;

            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = cached.width;
            let sourceHeight = cached.height;

            if (imageAspectRatio > canvasAspectRatio) {
              // Image is wider - crop horizontally
              sourceWidth = cached.height * canvasAspectRatio;
              sourceX = (cached.width - sourceWidth) / 2;
            } else {
              // Image is taller - crop vertically
              sourceHeight = cached.width / canvasAspectRatio;
              sourceY = (cached.height - sourceHeight) / 2;
            }

            // Draw the cropped portion to fill entire canvas
            octx.drawImage(
              cached,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight, // Source rectangle
              0,
              0,
              cssW,
              cssH // Destination rectangle
            );
          } else {
            const imageAspectRatio = cached.width / cached.height;
            // Use explicit bounds if present; else aspect-fit
            let { x, y, width, height } = layer;
            if (
              typeof x !== "number" ||
              typeof y !== "number" ||
              typeof width !== "number" ||
              typeof height !== "number"
            ) {
              const canvasAspectRatio = cssW / cssH;
              if (imageAspectRatio > canvasAspectRatio) {
                width = cssW;
                height = cssW / imageAspectRatio;
                x = 0;
                y = (cssH - height) / 2;
              } else {
                height = cssH;
                width = cssH * imageAspectRatio;
                x = (cssW - width) / 2;
                y = 0;
              }
            }
            octx.drawImage(cached, x, y, width, height);
          }
        }
      } else {
        const dx = layer.offsetX ?? 0;
        const dy = layer.offsetY ?? 0;
        octx.save();
        if (dx !== 0 || dy !== 0) {
          octx.translate(dx, dy);
        }
        for (const s of layer.strokes) {
          drawPathOnContext(octx, s);
        }
        // Draw in-progress stroke only on the active vector layer;
        // adjust for offset so the stroke aligns with the pointer
        const current = currentPathRef.current;
        if (current && layer.id === state.activeLayerId) {
          const adx = layer.offsetX ?? 0;
          const ady = layer.offsetY ?? 0;
          if (adx !== 0 || ady !== 0) {
            const pts = current.points;
            const adj: number[] = new Array(pts.length);
            for (let i = 0; i < pts.length; i += 2) {
              adj[i] = pts[i] - adx;
              adj[i + 1] = pts[i + 1] - ady;
            }
            drawPathOnContext(octx, { ...current, points: adj });
          } else {
            drawPathOnContext(octx, current);
          }
        }
        octx.restore();
      }

      // Composite this layer onto the main canvas using CSS pixel destination size
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cssW, cssH);
    }
    // Selection overlay
    const active = state.layers.find((l) => l.id === state.activeLayerId);
    if (state.mode === "move" && active && active.visible) {
      const rect = getLayerBoundingRect(active);
      if (rect) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#3b82f680"; // semi-transparent sky-500
        ctx.fillStyle = "#3b82f61a"; // very light fill
        const { x, y, width, height } = rect;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        // handles
        const handle = 6;
        const half = handle / 2;
        const corners: [number, number][] = [
          [x, y],
          [x + width, y],
          [x, y + height],
          [x + width, y + height],
        ];
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#2563eb"; // blue-600
        for (const [cx, cy] of corners) {
          ctx.beginPath();
          ctx.rect(cx - half, cy - half, handle, handle);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }, [state.layers, state.activeLayerId, state.mode, getLayerBoundingRect]);

  // Request a render using rAF, limited to TARGET_FPS
  const requestRender = useCallback((): void => {
    if (renderRequestedRef.current) {
      return;
    }
    renderRequestedRef.current = true;
    requestAnimationFrame(() => {
      const now = performance.now();
      if (now - lastRenderTimeRef.current >= FRAME_TIME) {
        drawAll();
        lastRenderTimeRef.current = now;
      }
      renderRequestedRef.current = false;
    });
  }, [drawAll]);

  // Force immediate render without frame rate limiting
  const forceRender = useCallback((): void => {
    drawAll();
    lastRenderTimeRef.current = performance.now();
    renderRequestedRef.current = false;
  }, [drawAll]);

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
    ctxRef.current = ctx;

    // Initialize or resize offscreen layer canvas to match
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement("canvas");
      offscreenRef.current = off;
    }
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext("2d");
    if (octx) {
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.lineJoin = "round";
      octx.lineCap = "round";
      offscreenCtxRef.current = octx;
    }
    requestRender();
  }, [requestRender]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Update drawing styles without resizing to avoid clearing the canvas
  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.lineWidth = state.brushSize;
      ctx.strokeStyle = state.strokeColor;
    }
    // Offscreen context uses per-stroke styles, but we still request a redraw
    requestRender();
  }, [state.brushSize, state.strokeColor, requestRender]);

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
        requestRender();
      };
      img.onerror = () => {
        // Do not retry automatically; leave uncached on error
      };
      img.src = src;
    },
    [requestRender]
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
    forceRender();
  }, [state.layers, forceRender]);

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
      // Only draw with the primary pointer. Allow mouse, pen, and touch.
      if (!evt.isPrimary) {
        return;
      }
      const type = evt.pointerType;
      if (type !== "mouse" && type !== "pen" && type !== "touch") {
        return;
      }
      // For mouse, restrict to left button; touch/pen do not use mouse buttons
      if (type === "mouse" && evt.button !== 0) {
        return;
      }
      (evt.target as Element).setPointerCapture(evt.pointerId);
      const [x, y] = getRelativePoint(evt);
      if (state.mode === "move") {
        const idx = hitTestLayers(x, y);
        if (idx >= 0) {
          const hit = state.layers[idx];
          dispatch({ type: "SELECT_LAYER", id: hit.id });
          if (hit.type === "image") {
            const rect = getLayerBoundingRect(hit);
            if (rect) {
              dispatch({
                type: "SET_IMAGE_BOUNDS",
                id: hit.id,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              });
            }
          }
          isDraggingRef.current = true;
          setIsDraggingUi(true);
          dragInfoRef.current = { id: hit.id, lastX: x, lastY: y };
        }
      } else {
        // Ensure we always draw on a vector layer (auto-create one if active is image)
        dispatch({ type: "ENSURE_ACTIVE_VECTOR_LAYER" });
        isDrawingRef.current = true;
        const start: PathStroke = {
          points: [x, y, x, y],
          color: state.strokeColor,
          size: state.brushSize,
          erase: state.mode === "erase",
        };
        currentPathRef.current = start;
        requestRender();
      }
    },
    [
      getRelativePoint,
      requestRender,
      state.strokeColor,
      state.brushSize,
      state.mode,
      hitTestLayers,
      getLayerBoundingRect,
      state.layers,
    ]
  );

  const onPointerMove = useCallback(
    (evt: PointerEvent): void => {
      if (state.mode === "move") {
        const drag = dragInfoRef.current;
        if (!drag || !isDraggingRef.current) {
          return;
        }
        if (!evt.isPrimary) {
          return;
        }
        const [x, y] = getRelativePoint(evt);
        let dx = x - drag.lastX;
        let dy = y - drag.lastY;
        // axis lock with Shift
        if (evt.shiftKey) {
          drag.axis ??= Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
          if (drag.axis === "x") dy = 0;
          else dx = 0;
        } else {
          drag.axis = undefined;
        }
        if (dx !== 0 || dy !== 0) {
          dispatch({ type: "MOVE_LAYER", id: drag.id, dx, dy });
          drag.lastX = x;
          drag.lastY = y;
          requestRender();
        }
        return;
      }
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

      const coalesced = getCoalescedEventsSafe(evt);
      const prev = curr.points;
      const pushIfFar = (x: number, y: number): void => {
        const n = prev.length;
        const lastX = prev[n - 2];
        const lastY = prev[n - 1];
        // Distance threshold ~ 1px to thin very dense input
        const dx = x - lastX;
        const dy = y - lastY;
        if (dx * dx + dy * dy >= 1) {
          prev.push(x, y);
        }
      };
      if (coalesced.length > 0) {
        for (const pe of coalesced) {
          const [cx, cy] = getRelativePoint(pe);
          pushIfFar(cx, cy);
        }
        currentPathRef.current = { ...curr, points: prev };
      } else {
        const [x, y] = getRelativePoint(evt);
        pushIfFar(x, y);
        currentPathRef.current = { ...curr, points: prev };
      }
      requestRender();
    },
    [getRelativePoint, requestRender, state.mode]
  );

  const onPointerUp = useCallback(
    (evt: PointerEvent): void => {
      (evt.target as Element).releasePointerCapture(evt.pointerId);
      if (state.mode === "move") {
        isDraggingRef.current = false;
        dragInfoRef.current = null;
        setIsDraggingUi(false);
        return;
      }
      if (!isDrawingRef.current) {
        return;
      }
      isDrawingRef.current = false;
      const finished = currentPathRef.current;
      currentPathRef.current = null;
      if (finished && finished.points.length >= 4) {
        // If active layer has an offset, store points in local coordinates
        const active = state.layers.find((l) => l.id === state.activeLayerId);
        let toStore = finished.points;
        if (active && active.type === "vector") {
          const adx = active.offsetX ?? 0;
          const ady = active.offsetY ?? 0;
          if (adx !== 0 || ady !== 0) {
            const pts = finished.points;
            const adj: number[] = new Array(pts.length);
            for (let i = 0; i < pts.length; i += 2) {
              adj[i] = pts[i] - adx;
              adj[i + 1] = pts[i + 1] - ady;
            }
            toStore = adj;
          }
        }
        dispatch({
          type: "ADD_STROKE_TO_ACTIVE",
          stroke: { ...finished, points: [...toStore] },
        });
        // Force immediate render of the completed stroke
        forceRender();
      }
    },
    [state.mode, state.activeLayerId, state.layers, forceRender]
  );

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
      (evt.target as Element | null)?.releasePointerCapture(evt.pointerId);
      if (state.mode === "move") {
        isDraggingRef.current = false;
        dragInfoRef.current = null;
        setIsDraggingUi(false);
      } else {
        isDrawingRef.current = false;
        currentPathRef.current = null;
      }
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
    const onKeyDown = (e: KeyboardEvent): void => {
      if (state.mode !== "move") return;
      const active = state.layers.find((l) => l.id === state.activeLayerId);
      if (!active) return;
      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      dispatch({ type: "MOVE_LAYER", id: active.id, dx, dy });
      requestRender();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      canvas.removeEventListener("contextmenu", preventContext);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    onPointerDown,
    onPointerMove,
    onPointerUp,
    state.mode,
    state.layers,
    state.activeLayerId,
    requestRender,
  ]);

  // UI state for controls
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [bananaPrompt, setBananaPrompt] = useState<string>("banana-fy");

  // Essential functions for controls
  const onClearActive = useCallback((): void => {
    dispatch({ type: "CLEAR_ACTIVE_LAYER" });
    currentPathRef.current = null;
    requestRender();
  }, [requestRender]);

  const onClearAll = useCallback((): void => {
    dispatch({ type: "CLEAR_ALL_LAYERS" });
    currentPathRef.current = null;
    requestRender();
  }, [requestRender]);

  const captureScreenshot = useCallback((): void => {
    const { cssW, cssH } = getCssSize();
    if (cssW <= 0 || cssH <= 0) {
      dispatch({ type: "SET_COMPOSITE", dataUrl: null });
      return;
    }
    const visibleLayers = state.layers.filter((l) => l.visible);
    (async () => {
      const dataUrl = await getCanvasScreenshotAsync(
        visibleLayers,
        Math.max(1, Math.floor(cssW)),
        Math.max(1, Math.floor(cssH)),
        1 // Force DPR=1 for consistent screenshot size across devices
      );
      dispatch({ type: "SET_COMPOSITE", dataUrl });
      try {
        if (dataUrl && onScreenshot) {
          await onScreenshot(dataUrl);
        }
      } catch {
        // ignore upload errors here
      }
    })();
  }, [state.layers, getCssSize, onScreenshot]);

  const downloadComposite = useCallback(async (): Promise<void> => {
    const { cssW, cssH } = getCssSize();
    if (cssW <= 0 || cssH <= 0) {
      return;
    }
    const visibleLayers = state.layers.filter((l) => l.visible);
    const dataUrl = await getCanvasScreenshotAsync(
      visibleLayers,
      Math.max(1, Math.floor(cssW)),
      Math.max(1, Math.floor(cssH)),
      1 // Force DPR=1 for consistent screenshot size across devices
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
  }, [state.layers, getCssSize]);

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
          !signJson.ok ||
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
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) {
        return;
      }
      let imageSrc = await uploadToCloudinary(file);
      imageSrc ??= URL.createObjectURL(file);
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
    const { cssW, cssH } = getCssSize();
    if (cssW <= 0 || cssH <= 0) {
      return;
    }
    setIsGenerating(true);
    try {
      const visibleLayers = state.layers.filter((l) => l.visible);
      const composite = await getCanvasScreenshotAsync(
        visibleLayers,
        Math.max(1, Math.floor(cssW)),
        Math.max(1, Math.floor(cssH)),
        1 // Force DPR=1 for consistent screenshot size across devices
      );
      // Fire onScreenshot for immediate thumbnail updates when generating
      try {
        if (composite && onScreenshot) {
          await onScreenshot(composite);
        }
      } catch {
        // ignore upload errors
      }
      const res = await fetch("/api/nano-banana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: bananaPrompt, images: [composite] }),
      });
      const json = (await res.json()) as { ok?: boolean; image?: string };
      if (json.ok && typeof json.image === "string" && json.image) {
        dispatch({
          type: "ADD_IMAGE_LAYER_TOP",
          name: "Generated Image",
          imageSrc: json.image,
          banana: true,
        });
        // Add a new blank layer on top after banana generation
        dispatch({ type: "ADD_LAYER" });
      }
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, state.layers, bananaPrompt, getCssSize, onScreenshot]);

  // Create controls state and actions
  const controlsState = {
    mode: state.mode,
    strokeColor: state.strokeColor,
    brushSize: state.brushSize,
    compositeDataUrl: state.compositeDataUrl,
    isGenerating,
    bananaPrompt,
    panelsCollapsed: {
      tools: panelsCollapsed.tools,
      actions: panelsCollapsed.actions,
      banana: panelsCollapsed.banana,
    },
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };

  const controlsActions = {
    setMode: (mode: BoardMode) => dispatch({ type: "SET_MODE", mode }),
    setColor: (color: string) => dispatch({ type: "SET_COLOR", color }),
    setBrushSize: (size: number) => dispatch({ type: "SET_BRUSH_SIZE", size }),
    clearActive: onClearActive,
    clearAll: onClearAll,
    captureComposite: captureScreenshot,
    downloadComposite,
    openUpload: onOpenUpload,
    generateBanana: onGenerateBanana,
    setBananaPrompt,
    togglePanelCollapsed: (panel: keyof typeof panelsCollapsed) => {
      setPanelsCollapsed((prev) => ({ ...prev, [panel]: !prev[panel] }));
    },
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
  } as const;

  const layerActions = {
    addLayer: () => dispatch({ type: "ADD_LAYER" }),
    removeLayer: (id: string) => dispatch({ type: "REMOVE_LAYER", id }),
    selectLayer: (id: string) => dispatch({ type: "SELECT_LAYER", id }),
    toggleLayerVisibility: (id: string) =>
      dispatch({ type: "TOGGLE_LAYER_VISIBILITY", id }),
    clearLayer: (id: string) => dispatch({ type: "CLEAR_LAYER", id }),
    reorderLayers: (orderTopToBottom: string[]) => {
      // internal reducer expects bottom->top order
      const bottomToTop = [...orderTopToBottom].reverse();
      dispatch({ type: "REORDER_LAYERS", order: bottomToTop });
      requestRender();
    },
    setBackgroundColor: (id: string, color: string) => {
      dispatch({ type: "SET_BACKGROUND_COLOR", id, color });
      requestRender();
    },
  } as const;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full select-none touch-none ${
            state.mode === "move"
              ? isDraggingUi
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-crosshair"
          }`}
        />
      </div>

      {/* Canvas Controls */}
      <CanvasBoardControls
        state={controlsState}
        actions={controlsActions}
        fileInputRef={fileInputRef}
        layers={state.layers}
        activeLayerId={state.activeLayerId}
        layerActions={layerActions}
        layersPanelCollapsed={panelsCollapsed.layers}
        onToggleLayersPanel={() => {
          setPanelsCollapsed((prev) => ({ ...prev, layers: !prev.layers }));
        }}
      />

      {/* Hidden file input for upload functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e): void => {
          void onFileSelected(e);
        }}
        className="hidden"
      />
    </div>
  );
}
