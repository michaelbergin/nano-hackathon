/**
 * Custom hook for canvas pointer event handling
 * Manages drawing, dragging, and keyboard navigation
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Layer, PathStroke, BoardMode, BoardAction } from "@/types/canvas";
import { getCoalescedEventsSafe } from "@/lib/typeGuards";
import { getRelativePoint, hitTestLayers } from "./canvasRendering";

export interface DragInfo {
  id: string;
  lastX: number;
  lastY: number;
  axis?: "x" | "y";
}

export interface UseCanvasPointersOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentPathRef: React.MutableRefObject<PathStroke | null>;
  layers: Layer[];
  activeLayerId: string;
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  imageCacheRef: React.RefObject<Map<string, HTMLImageElement>>;
  dispatch: React.Dispatch<BoardAction>;
  requestRender: () => void;
  forceRender: () => void;
  getCssSize: () => { cssW: number; cssH: number };
  getLayerBoundingRect: (layer: Layer) => { x: number; y: number; width: number; height: number } | null;
}

export interface UseCanvasPointersReturn {
  isDraggingUi: boolean;
  isDrawingRef: React.RefObject<boolean>;
  isDraggingRef: React.RefObject<boolean>;
}

export function useCanvasPointers(
  options: UseCanvasPointersOptions
): UseCanvasPointersReturn {
  const {
    canvasRef,
    currentPathRef,
    layers,
    activeLayerId,
    mode,
    strokeColor,
    brushSize,
    imageCacheRef,
    dispatch,
    requestRender,
    forceRender,
    getCssSize,
    getLayerBoundingRect,
  } = options;

  const isDrawingRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const [isDraggingUi, setIsDraggingUi] = useState<boolean>(false);

  const getPoint = useCallback(
    (evt: PointerEvent): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      return getRelativePoint(evt, canvas);
    },
    [canvasRef]
  );

  const hitTest = useCallback(
    (x: number, y: number): number => {
      const { cssW, cssH } = getCssSize();
      return hitTestLayers(layers, x, y, cssW, cssH, imageCacheRef.current);
    },
    [layers, getCssSize, imageCacheRef]
  );

  const onPointerDown = useCallback(
    (evt: PointerEvent): void => {
      if (!evt.isPrimary) return;
      const type = evt.pointerType;
      if (type !== "mouse" && type !== "pen" && type !== "touch") return;
      if (type === "mouse" && evt.button !== 0) return;

      (evt.target as Element).setPointerCapture(evt.pointerId);
      const [x, y] = getPoint(evt);

      if (mode === "move") {
        const idx = hitTest(x, y);
        if (idx >= 0) {
          const hit = layers[idx];
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
        dispatch({ type: "ENSURE_ACTIVE_VECTOR_LAYER" });
        isDrawingRef.current = true;
        const start: PathStroke = {
          points: [x, y, x, y],
          color: strokeColor,
          size: brushSize,
          erase: mode === "erase",
        };
        currentPathRef.current = start;
        requestRender();
      }
    },
    [
      getPoint,
      mode,
      hitTest,
      layers,
      dispatch,
      getLayerBoundingRect,
      strokeColor,
      brushSize,
      currentPathRef,
      requestRender,
    ]
  );

  const onPointerMove = useCallback(
    (evt: PointerEvent): void => {
      if (mode === "move") {
        const drag = dragInfoRef.current;
        if (!drag || !isDraggingRef.current) return;
        if (!evt.isPrimary) return;

        const [x, y] = getPoint(evt);
        let dx = x - drag.lastX;
        let dy = y - drag.lastY;

        // Axis lock with Shift
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

      if (!isDrawingRef.current) return;
      if (!evt.isPrimary) return;

      const curr = currentPathRef.current;
      if (!curr) return;

      const coalesced = getCoalescedEventsSafe(evt);
      const prev = curr.points;

      const pushIfFar = (px: number, py: number): void => {
        const n = prev.length;
        const lastX = prev[n - 2];
        const lastY = prev[n - 1];
        const ddx = px - lastX;
        const ddy = py - lastY;
        if (ddx * ddx + ddy * ddy >= 1) {
          prev.push(px, py);
        }
      };

      if (coalesced.length > 0) {
        for (const pe of coalesced) {
          const canvas = canvasRef.current;
          if (canvas) {
            const [cx, cy] = getRelativePoint(pe, canvas);
            pushIfFar(cx, cy);
          }
        }
      } else {
        const [x, y] = getPoint(evt);
        pushIfFar(x, y);
      }

      currentPathRef.current = { ...curr, points: prev };
      requestRender();
    },
    [mode, getPoint, currentPathRef, requestRender, dispatch, canvasRef]
  );

  const onPointerUp = useCallback(
    (evt: PointerEvent): void => {
      (evt.target as Element).releasePointerCapture(evt.pointerId);

      if (mode === "move") {
        isDraggingRef.current = false;
        dragInfoRef.current = null;
        setIsDraggingUi(false);
        return;
      }

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      const finished = currentPathRef.current;
      currentPathRef.current = null;

      if (finished && finished.points.length >= 4) {
        const active = layers.find((l) => l.id === activeLayerId);
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
        forceRender();
      }
    },
    [mode, activeLayerId, layers, currentPathRef, dispatch, forceRender]
  );

  // Setup pointer event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const down = (e: Event): void => onPointerDown(e as PointerEvent);
    const move = (e: Event): void => onPointerMove(e as PointerEvent);
    const up = (e: Event): void => onPointerUp(e as PointerEvent);

    const cancel = (e: Event): void => {
      const evt = e as PointerEvent;
      (evt.target as Element | null)?.releasePointerCapture(evt.pointerId);
      if (mode === "move") {
        isDraggingRef.current = false;
        dragInfoRef.current = null;
        setIsDraggingUi(false);
      } else {
        isDrawingRef.current = false;
        currentPathRef.current = null;
      }
    };

    const lostCapture = (e: Event): void => onPointerUp(e as PointerEvent);
    const preventContext = (e: Event): void => e.preventDefault();

    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel, { passive: false });
    canvas.addEventListener("lostpointercapture", lostCapture);
    canvas.addEventListener("contextmenu", preventContext, { passive: false });

    // Keyboard navigation for move mode
    const onKeyDown = (e: KeyboardEvent): void => {
      if (mode !== "move") return;
      const active = layers.find((l) => l.id === activeLayerId);
      if (!active) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
          dy = -step;
          break;
        case "ArrowDown":
          dy = step;
          break;
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
        default:
          return;
      }

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
    canvasRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    mode,
    layers,
    activeLayerId,
    dispatch,
    requestRender,
    currentPathRef,
  ]);

  return {
    isDraggingUi,
    isDrawingRef,
    isDraggingRef,
  };
}
