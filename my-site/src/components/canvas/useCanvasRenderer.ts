/**
 * Custom hook for canvas rendering with offscreen buffer
 * Handles canvas setup, resize, and frame-rate limited rendering
 */

import { useCallback, useEffect, useRef } from "react";
import type { Layer, PathStroke, BoardMode } from "@/types/canvas";
import {
  getLayerBounds,
  drawBackgroundLayer,
  drawImageLayer,
  drawVectorLayer,
  drawSelectionOverlay,
  resizeCanvasToContainer,
} from "./canvasRendering";

// Target frame rate for canvas redraws
const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;

export interface CanvasRendererState {
  layers: Layer[];
  activeLayerId: string;
  mode: BoardMode;
}

export interface UseCanvasRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
  imageCacheRef: React.RefObject<Map<string, HTMLImageElement>>;
  currentPathRef: React.RefObject<PathStroke | null>;
  requestRender: () => void;
  forceRender: () => void;
  getCssSize: () => { cssW: number; cssH: number };
  getLayerBoundingRect: (layer: Layer) => { x: number; y: number; width: number; height: number } | null;
  ensureImageLoaded: (src: string) => void;
}

export function useCanvasRenderer(
  state: CanvasRendererState
): UseCanvasRendererReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const currentPathRef = useRef<PathStroke | null>(null);

  // Render scheduling
  const lastRenderTimeRef = useRef<number>(0);
  const renderRequestedRef = useRef<boolean>(false);

  const getCssSize = useCallback((): { cssW: number; cssH: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { cssW: 0, cssH: 0 };
    const cssW = Math.max(1, Math.floor(canvas.clientWidth));
    const cssH = Math.max(1, Math.floor(canvas.clientHeight));
    return { cssW, cssH };
  }, []);

  const getLayerBoundingRect = useCallback(
    (layer: Layer): { x: number; y: number; width: number; height: number } | null => {
      const { cssW, cssH } = getCssSize();
      return getLayerBounds(layer, cssW, cssH, imageCacheRef.current);
    },
    [getCssSize]
  );

  const drawAll = useCallback((): void => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Ensure offscreen canvas exists and matches size/transform
    let off = offscreenRef.current;
    let octx = offscreenCtxRef.current;
    if (!off || !octx) {
      off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      octx = off.getContext("2d");
      if (!octx) return;
      const m = ctx.getTransform();
      octx.setTransform(m.a || 1, m.b || 0, m.c || 0, m.d || 1, m.e || 0, m.f || 0);
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

    // Clear main canvas
    ctx.clearRect(0, 0, cssW, cssH);

    for (const layer of state.layers) {
      if (!layer.visible) continue;

      // Reset offscreen canvas
      if (off.width !== canvas.width || off.height !== canvas.height) {
        off.width = canvas.width;
        off.height = canvas.height;
        octx.setTransform(m.a || 1, m.b || 0, m.c || 0, m.d || 1, m.e || 0, m.f || 0);
        octx.lineJoin = "round";
        octx.lineCap = "round";
      }
      octx.clearRect(0, 0, off.width, off.height);

      // Draw layer based on type
      if (layer.type === "background") {
        drawBackgroundLayer(octx, layer, cssW, cssH);
      } else if (layer.type === "image") {
        drawImageLayer(octx, layer, cssW, cssH, imageCacheRef.current);
      } else {
        drawVectorLayer(octx, layer, currentPathRef.current, state.activeLayerId);
      }

      // Composite layer onto main canvas
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cssW, cssH);
    }

    // Selection overlay
    const active = state.layers.find((l) => l.id === state.activeLayerId);
    if (state.mode === "move" && active && active.visible) {
      const rect = getLayerBoundingRect(active);
      if (rect) {
        drawSelectionOverlay(ctx, rect);
      }
    }
  }, [state.layers, state.activeLayerId, state.mode, getLayerBoundingRect]);

  const requestRender = useCallback((): void => {
    if (renderRequestedRef.current) return;
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

  const forceRender = useCallback((): void => {
    drawAll();
    lastRenderTimeRef.current = performance.now();
    renderRequestedRef.current = false;
  }, [drawAll]);

  const resizeCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = resizeCanvasToContainer(canvas, container);
    if (!ctx) return;
    ctxRef.current = ctx;

    // Resize offscreen canvas to match
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement("canvas");
      offscreenRef.current = off;
    }
    off.width = canvas.width;
    off.height = canvas.height;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const octx = off.getContext("2d");
    if (octx) {
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.lineJoin = "round";
      octx.lineCap = "round";
      offscreenCtxRef.current = octx;
    }
    requestRender();
  }, [requestRender]);

  const ensureImageLoaded = useCallback(
    (src: string): void => {
      if (imageCacheRef.current.has(src)) return;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        requestRender();
      };
      img.onerror = () => {
        // Do not retry on error
      };
      img.src = src;
    },
    [requestRender]
  );

  // Setup resize listener
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Force render when layers change
  useEffect(() => {
    forceRender();
  }, [state.layers, forceRender]);

  // Preload images for visible image layers
  useEffect(() => {
    for (const layer of state.layers) {
      if (layer.type === "image" && layer.visible) {
        ensureImageLoaded(layer.imageSrc);
      }
    }
  }, [state.layers, ensureImageLoaded]);

  return {
    canvasRef,
    containerRef,
    ctxRef,
    imageCacheRef,
    currentPathRef,
    requestRender,
    forceRender,
    getCssSize,
    getLayerBoundingRect,
    ensureImageLoaded,
  };
}
