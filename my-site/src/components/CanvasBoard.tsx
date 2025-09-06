"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Point2 = [number, number];
type PolyLine2 = number[];
type PathStroke = {
  points: PolyLine2;
  color: string;
  size: number;
  erase: boolean;
};

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

  const [paths, setPaths] = useState<PathStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentPathRef = useRef<PathStroke | null>(null);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const [strokeColor, setStrokeColor] = useState<string>("#111827");
  const [brushSize, setBrushSize] = useState<number>(4);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      try {
        const parsedData = JSON.parse(initialData);
        if (Array.isArray(parsedData)) {
          setPaths(parsedData);
        }
      } catch (err) {
        console.error("Failed to parse initial canvas data:", err);
      }
    }
  }, [initialData]);

  // Save data when paths change
  useEffect(() => {
    if (onSave && paths.length > 0) {
      const data = JSON.stringify(paths);
      onSave(data);
    }
  }, [paths, onSave]);

  const drawPath = useCallback((stroke: PathStroke): void => {
    const ctx = ctxRef.current;
    const polyline = stroke.points;
    if (!ctx || polyline.length < 4) {
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
  }, []);

  const drawAll = useCallback((): void => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of paths) {
      drawPath(s);
    }
    const current = currentPathRef.current;
    if (current) {
      drawPath(current);
    }
  }, [paths, drawPath]);

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
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = strokeColor;
    ctxRef.current = ctx;
    drawAll();
  }, [brushSize, strokeColor, drawAll]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

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
  }, [paths, drawAll]);

  const onPointerDown = useCallback(
    (evt: PointerEvent): void => {
      if (evt.button !== 0) {
        return;
      }
      (evt.target as Element).setPointerCapture?.(evt.pointerId);
      isDrawingRef.current = true;
      const [x, y] = getRelativePoint(evt);
      const start: PathStroke = {
        points: [x, y, x, y],
        color: strokeColor,
        size: brushSize,
        erase: mode === "erase",
      };
      currentPathRef.current = start;
      drawAll();
    },
    [getRelativePoint, drawAll, strokeColor, brushSize, mode]
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
      setPaths((prev) => [
        ...prev,
        { ...finished, points: [...finished.points] },
      ]);
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

  const onClear = useCallback((): void => {
    setPaths([]);
    currentPathRef.current = null;
    drawAll();
  }, [drawAll]);

  const onColorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setStrokeColor(e.target.value);
    },
    []
  );

  const onSizeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const next = Number(e.target.value);
      setBrushSize(Number.isFinite(next) ? Math.max(1, Math.min(24, next)) : 4);
      resizeCanvas();
    },
    [resizeCanvas]
  );

  const drawActive = mode === "draw";

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair select-none"
        />
      </div>

      <div className="pointer-events-none absolute top-3 left-3 z-10">
        <div className="pointer-events-auto border rounded bg-white p-3 space-y-3 shadow">
          <div className="text-sm font-medium">Canvas</div>
          <div className="flex items-center gap-2">
            <button
              onClick={(): void => setMode("draw")}
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
              onClick={(): void => setMode("erase")}
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
              value={strokeColor}
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
              value={brushSize}
              onChange={onSizeChange}
            />
            <span className="text-xs text-gray-500 w-6 text-right">
              {brushSize}
            </span>
          </div>
          <div>
            <button
              onClick={onClear}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
