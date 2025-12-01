"use client";

import type { JSX, ChangeEvent } from "react";
import { useId, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Eraser,
  RotateCcw,
  RotateCw,
  Move as MoveIcon,
} from "lucide-react";
import type { BoardMode } from "./CanvasBoard";
import { useMobile } from "@/hooks/useMobile";

export interface ToolControlsProps {
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  canUndo: boolean;
  canRedo: boolean;
  setMode: (mode: BoardMode) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  undo: () => void;
  redo: () => void;
}

const BRUSH_SIZES = [4, 10, 20] as const;

export function ToolControls({
  mode,
  strokeColor,
  brushSize,
  canUndo,
  canRedo,
  setMode,
  setColor,
  setBrushSize,
  undo,
  redo,
}: ToolControlsProps): JSX.Element {
  const isDraw = mode === "draw";
  const isErase = mode === "erase";
  const isMove = mode === "move";
  const colorId = useId();
  const isMobile = useMobile();
  const [brushPickerOpen, setBrushPickerOpen] = useState(false);
  const brushPickerRef = useRef<HTMLDivElement>(null);

  // Close brush picker when clicking outside
  useEffect(() => {
    if (!brushPickerOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        brushPickerRef.current &&
        !brushPickerRef.current.contains(event.target as Node)
      ) {
        setBrushPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [brushPickerOpen]);

  const handleBrushSelect = (size: number) => {
    setBrushSize(size);
    setBrushPickerOpen(false);
  };

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-background/80 backdrop-blur border"
      role="toolbar"
      aria-label="Canvas tools"
    >
      {/* Mode toggle group */}
      <div className="flex items-center gap-1 p-0.5 rounded-full border bg-muted/40">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMode("draw")}
          aria-pressed={isDraw}
          title="Draw"
          className={`rounded-full ${
            isDraw ? "bg-sky-500/20 ring-1 ring-black hover:bg-sky-500/30" : ""
          }`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMode("erase")}
          aria-pressed={isErase}
          title="Erase"
          className={`rounded-full ${
            isErase ? "bg-sky-500/20 ring-1 ring-black hover:bg-sky-500/30" : ""
          }`}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMode("move")}
          aria-pressed={isMove}
          title="Move"
          className={`rounded-full ${
            isMove ? "bg-sky-500/20 ring-1 ring-black hover:bg-sky-500/30" : ""
          }`}
        >
          <MoveIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1 p-0.5 rounded-full border bg-muted/40">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
          className="rounded-full"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
          className="rounded-full"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Color and brush size */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={colorId}
          className="relative h-8 w-8 rounded-md border overflow-hidden cursor-pointer"
          title="Brush color"
        >
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: strokeColor }}
          />
        </label>
        <input
          id={colorId}
          type="color"
          value={strokeColor}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setColor(e.target.value)
          }
          className="sr-only"
          aria-label="Brush color"
        />
        {/* Brush size picker - collapsible on mobile */}
        {isMobile ? (
          <div ref={brushPickerRef} className="relative">
            {/* Active brush indicator (tap to expand) */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setBrushPickerOpen(!brushPickerOpen)}
              aria-expanded={brushPickerOpen}
              aria-haspopup="listbox"
              title={`${brushSize}px brush - tap to change`}
              className="rounded-full border bg-muted/40"
            >
              <span className="sr-only">{brushSize}px</span>
              <span
                aria-hidden
                className="rounded-full"
                style={{
                  backgroundColor: strokeColor,
                  width: `${Math.max(4, Math.min(20, brushSize))}px`,
                  height: `${Math.max(4, Math.min(20, brushSize))}px`,
                }}
              />
            </Button>

            {/* Expanded vertical picker */}
            {brushPickerOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-1 p-1.5 rounded-xl border-2 bg-background shadow-xl z-[100] pointer-events-auto">
                {BRUSH_SIZES.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleBrushSelect(size)}
                    aria-pressed={brushSize === size}
                    title={`${size}px brush`}
                    className={`rounded-full ${
                      brushSize === size
                        ? "bg-sky-500/20 ring-1 ring-black hover:bg-sky-500/30"
                        : ""
                    }`}
                  >
                    <span className="sr-only">{size}px</span>
                    <span
                      aria-hidden
                      className="rounded-full"
                      style={{
                        backgroundColor: strokeColor,
                        width: `${Math.max(4, Math.min(20, size))}px`,
                        height: `${Math.max(4, Math.min(20, size))}px`,
                      }}
                    />
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 p-0.5 rounded-full border bg-muted/40">
            {BRUSH_SIZES.map((size) => (
              <Button
                key={size}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setBrushSize(size)}
                aria-pressed={brushSize === size}
                title={`${size}px brush`}
                className={`rounded-full ${
                  brushSize === size
                    ? "bg-sky-500/20 ring-1 ring-black hover:bg-sky-500/30"
                    : ""
                }`}
              >
                <span className="sr-only">{size}px</span>
                <span
                  aria-hidden
                  className="rounded-full"
                  style={{
                    backgroundColor: strokeColor,
                    width: `${Math.max(4, Math.min(20, size))}px`,
                    height: `${Math.max(4, Math.min(20, size))}px`,
                  }}
                />
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
