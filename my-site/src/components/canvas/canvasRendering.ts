/**
 * Canvas rendering utilities
 * Pure functions for canvas operations extracted from CanvasBoard
 */

import type {
  Layer,
  VectorLayer,
  ImageLayer,
  BackgroundLayer,
  PathStroke,
  Rect,
} from "@/types/canvas";
import { drawPathOnContext } from "@/components/canvasUtils";

/**
 * Calculate bounding rectangle for a layer
 */
export function getLayerBounds(
  layer: Layer,
  canvasWidth: number,
  canvasHeight: number,
  imageCache: Map<string, HTMLImageElement>
): Rect | null {
  if (canvasWidth === 0 || canvasHeight === 0) return null;

  if (layer.type === "background") {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  if (layer.type === "image") {
    const { x, y, width, height } = layer;
    // Use explicit bounds if present
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof width === "number" &&
      typeof height === "number"
    ) {
      return { x, y, width, height };
    }

    const cached = imageCache.get(layer.imageSrc) ?? null;
    if (cached) {
      // Banana images always fill the entire canvas
      if (layer.banana) {
        return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
      }
      // Regular images use aspect-fit
      const imageAspectRatio = cached.width / cached.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      let bx: number, by: number, bw: number, bh: number;

      if (imageAspectRatio > canvasAspectRatio) {
        bw = canvasWidth;
        bh = canvasWidth / imageAspectRatio;
        bx = 0;
        by = (canvasHeight - bh) / 2;
      } else {
        bh = canvasHeight;
        bw = canvasHeight * imageAspectRatio;
        bx = (canvasWidth - bw) / 2;
        by = 0;
      }
      return { x: bx, y: by, width: bw, height: bh };
    }
    // Fallback: assume full canvas until image loads
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  // Vector layer
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
      const px = pts[i];
      const py = pts[i + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
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
}

/**
 * Hit test layers at a point, returning the index of the topmost hit layer
 * Returns -1 if no layer is hit
 */
export function hitTestLayers(
  layers: Layer[],
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  imageCache: Map<string, HTMLImageElement>
): number {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible) continue;
    if (layer.type === "background") continue;

    const rect = getLayerBounds(layer, canvasWidth, canvasHeight, imageCache);
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
}

/**
 * Draw a background layer to context
 */
export function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  layer: BackgroundLayer,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();
  ctx.fillStyle = layer.color;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Draw an image layer to context with cover (banana) or contain scaling
 */
export function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  canvasWidth: number,
  canvasHeight: number,
  imageCache: Map<string, HTMLImageElement>
): void {
  const cached = imageCache.get(layer.imageSrc) ?? null;
  if (!cached) return;

  if (layer.banana) {
    // Cover scaling - image fills entire canvas, may crop
    const imageAspectRatio = cached.width / cached.height;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = cached.width;
    let sourceHeight = cached.height;

    if (imageAspectRatio > canvasAspectRatio) {
      sourceWidth = cached.height * canvasAspectRatio;
      sourceX = (cached.width - sourceWidth) / 2;
    } else {
      sourceHeight = cached.width / canvasAspectRatio;
      sourceY = (cached.height - sourceHeight) / 2;
    }

    ctx.drawImage(
      cached,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
  } else {
    // Use explicit bounds if present; else aspect-fit
    let { x, y, width, height } = layer;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof width !== "number" ||
      typeof height !== "number"
    ) {
      const imageAspectRatio = cached.width / cached.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      if (imageAspectRatio > canvasAspectRatio) {
        width = canvasWidth;
        height = canvasWidth / imageAspectRatio;
        x = 0;
        y = (canvasHeight - height) / 2;
      } else {
        height = canvasHeight;
        width = canvasHeight * imageAspectRatio;
        x = (canvasWidth - width) / 2;
        y = 0;
      }
    }
    ctx.drawImage(cached, x, y, width, height);
  }
}

/**
 * Draw a vector layer to context
 */
export function drawVectorLayer(
  ctx: CanvasRenderingContext2D,
  layer: VectorLayer,
  currentStroke: PathStroke | null,
  activeLayerId: string
): void {
  const dx = layer.offsetX ?? 0;
  const dy = layer.offsetY ?? 0;

  ctx.save();
  if (dx !== 0 || dy !== 0) {
    ctx.translate(dx, dy);
  }

  for (const stroke of layer.strokes) {
    drawPathOnContext(ctx, stroke);
  }

  // Draw in-progress stroke only on the active vector layer
  if (currentStroke && layer.id === activeLayerId) {
    const adx = layer.offsetX ?? 0;
    const ady = layer.offsetY ?? 0;
    if (adx !== 0 || ady !== 0) {
      const pts = currentStroke.points;
      const adj: number[] = new Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        adj[i] = pts[i] - adx;
        adj[i + 1] = pts[i + 1] - ady;
      }
      drawPathOnContext(ctx, { ...currentStroke, points: adj });
    } else {
      drawPathOnContext(ctx, currentStroke);
    }
  }

  ctx.restore();
}

/**
 * Draw selection overlay (bounding box with handles)
 */
export function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  rect: Rect
): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#3b82f680"; // semi-transparent sky-500
  ctx.fillStyle = "#3b82f61a"; // very light fill

  const { x, y, width, height } = rect;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  // Corner handles
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

/**
 * Get CSS pixel position from pointer event relative to canvas
 */
export function getRelativePoint(
  evt: PointerEvent,
  canvas: HTMLCanvasElement
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  return [x, y];
}

/**
 * Resize canvas to match container with DPR scaling
 */
export function resizeCanvasToContainer(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): CanvasRenderingContext2D | null {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const rect = container.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = `${Math.max(1, Math.floor(rect.width))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(rect.height))}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  return ctx;
}

/**
 * Setup offscreen canvas to match main canvas
 */
export function setupOffscreenCanvas(
  mainCanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const off = document.createElement("canvas");
  off.width = mainCanvas.width;
  off.height = mainCanvas.height;
  const octx = off.getContext("2d");
  if (!octx) return null;

  const m = ctx.getTransform();
  octx.setTransform(m.a || 1, m.b || 0, m.c || 0, m.d || 1, m.e || 0, m.f || 0);
  octx.lineJoin = "round";
  octx.lineCap = "round";

  return { canvas: off, ctx: octx };
}
