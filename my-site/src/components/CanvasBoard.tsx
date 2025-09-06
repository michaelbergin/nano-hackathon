"use client";

import type { JSX, ChangeEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

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
      // eslint-disable-next-line no-console
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
      const img = new Image();
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
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

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
    } catch (_e) {
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
          ctx.drawImage(cached, 0, 0, canvas.width, canvas.height);
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
      const img = new Image();
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
      const [x, y] = getRelativePoint(evt);
      const curr = currentPathRef.current;
      if (!curr) {
        return;
      }
      currentPathRef.current = {
        ...curr,
        points: [...curr.points, x, y],
      };
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
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
        body: JSON.stringify({ prompt: "banana-fy", images: [composite] }),
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
    } catch (_e) {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, state.layers]);

  const drawActive = state.mode === "draw";
  const activeLayerId = state.activeLayerId;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair select-none"
        />
      </div>

      <div className="pointer-events-none absolute top-3 left-3 z-10">
        <div className="pointer-events-auto border rounded bg-white p-3 space-y-3 shadow w-[320px]">
          <div className="text-sm font-medium">Canvas</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSetModeDraw}
              aria-pressed={drawActive}
              className={`rounded border px-3 py-1 text-sm ${
                drawActive
                  ? "bg-gray-900 text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Draw
            </button>
            <button
              onClick={onSetModeErase}
              aria-pressed={!drawActive}
              className={`rounded border px-3 py-1 text-sm ${
                !drawActive
                  ? "bg-gray-900 text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Erase
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Color</label>
            <input
              type="color"
              value={state.strokeColor}
              onChange={onColorChange}
              className="h-8 w-10 p-0 border rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Brush</label>
            <input
              type="range"
              min={1}
              max={24}
              value={state.brushSize}
              onChange={onSizeChange}
            />
            <span className="text-xs text-gray-500 w-6 text-right">
              {state.brushSize}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearActive}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              Clear Active
            </button>
            <button
              onClick={onClearAll}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              Clear All
            </button>
            <button
              onClick={captureScreenshot}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              Screenshot
            </button>
          </div>
          <div className="border-t pt-2">
            <div className="text-sm font-medium mb-1">Layers</div>
            <div className="max-h-40 overflow-auto space-y-1">
              {state.layers.map((layer) => {
                const isActive = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                      isActive ? "bg-gray-100" : ""
                    }`}
                  >
                    <button
                      onClick={(): void => onSelectLayer(layer.id)}
                      className="flex-1 text-left text-sm truncate"
                      title={layer.name}
                    >
                      {isActive ? "●" : "○"} {layer.name}{" "}
                      {layer.type === "image" &&
                      (layer as ImageLayer).banana ? (
                        <span className="ml-1 inline-block text-[10px] px-1 py-0.5 rounded bg-yellow-200 text-yellow-900 align-middle">
                          banana
                        </span>
                      ) : null}
                    </button>
                    <button
                      onClick={(): void => onToggleLayer(layer.id)}
                      className="rounded border bg-white px-2 py-0.5 text-xs hover:bg-gray-50"
                      title={layer.visible ? "Hide" : "Show"}
                    >
                      {layer.visible ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={(): void => onRemoveLayer(layer.id)}
                      className="rounded border bg-white px-2 py-0.5 text-xs hover:bg-gray-50"
                      disabled={state.layers.length <= 1}
                      title="Delete layer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-2">
              <button
                onClick={onAddLayer}
                className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 w-full"
              >
                + Add Layer
              </button>
            </div>
          </div>
          <div className="border-t pt-2">
            <button
              onClick={onGenerateBanana}
              className="w-full rounded border bg-yellow-400 px-3 py-1 text-sm text-yellow-950 hover:bg-yellow-300 disabled:opacity-50"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate Banana Layer"}
            </button>
          </div>
          {state.compositeDataUrl ? (
            <div className="border-t pt-2">
              <div className="text-sm text-gray-700 mb-1">
                Latest Screenshot
              </div>
              <img
                src={state.compositeDataUrl}
                alt="Canvas screenshot"
                className="block w-full h-auto border"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
