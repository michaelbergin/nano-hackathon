"use client";

import type { JSX, ChangeEvent } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import CanvasBoardControls from "./CanvasBoardControls";
import {
  boardReducer,
  createLayer,
  drawPathOnContext,
  generateLayerId,
  getCanvasScreenshotAsync,
} from "./canvasUtils";
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

export function CanvasBoard({
  initialData,
  onSave,
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

      if (layer.type === "image") {
        const cached = imageCacheRef.current.get(layer.imageSrc) ?? null;
        if (cached) {
          const imageAspectRatio = cached.width / cached.height;
          const canvasAspectRatio = cssW / cssH;

          let drawWidth: number;
          let drawHeight: number;
          let drawX: number;
          let drawY: number;

          if (imageAspectRatio > canvasAspectRatio) {
            drawWidth = cssW;
            drawHeight = cssW / imageAspectRatio;
            drawX = 0;
            drawY = (cssH - drawHeight) / 2;
          } else {
            drawHeight = cssH;
            drawWidth = cssH * imageAspectRatio;
            drawX = (cssW - drawWidth) / 2;
            drawY = 0;
          }

          octx.drawImage(cached, drawX, drawY, drawWidth, drawHeight);
        }
      } else {
        for (const s of layer.strokes) {
          drawPathOnContext(octx, s);
        }
        // Draw in-progress stroke only on the active vector layer
        const current = currentPathRef.current;
        if (current && layer.id === state.activeLayerId) {
          drawPathOnContext(octx, current);
        }
      }

      // Composite this layer onto the main canvas using CSS pixel destination size
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cssW, cssH);
    }
  }, [state.layers, state.activeLayerId]);

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

  // UI state for controls
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [bananaPrompt, setBananaPrompt] = useState<string>("banana-fy");

  // Essential functions for controls
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

  // Create controls state and actions
  const controlsState = {
    mode: state.mode,
    strokeColor: state.strokeColor,
    brushSize: state.brushSize,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    compositeDataUrl: state.compositeDataUrl,
    isGenerating,
    bananaPrompt,
  };

  const controlsActions = {
    addLayer: () => dispatch({ type: "ADD_LAYER" }),
    removeLayer: (id: string) => dispatch({ type: "REMOVE_LAYER", id }),
    selectLayer: (id: string) => dispatch({ type: "SELECT_LAYER", id }),
    toggleLayerVisibility: (id: string) =>
      dispatch({ type: "TOGGLE_LAYER_VISIBILITY", id }),
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
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair select-none touch-none"
        />
      </div>

      {/* Canvas Controls */}
      <CanvasBoardControls
        state={controlsState}
        actions={controlsActions}
        fileInputRef={fileInputRef}
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
