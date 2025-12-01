import type {
  Layer,
  VectorLayer,
  PathStroke,
  BackgroundLayer,
} from "@/types/canvas";

/**
 * Generate a unique layer ID using timestamp and random string
 */
export function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Create a new vector layer with the given name
 */
export function createLayer(name: string): VectorLayer {
  return {
    id: generateLayerId(),
    name,
    visible: true,
    type: "vector",
    strokes: [],
  };
}

/**
 * Create a background layer with a solid color.
 */
export function createBackgroundLayer(color: string): BackgroundLayer {
  return {
    id: generateLayerId(),
    name: "Background",
    visible: true,
    type: "background",
    color,
  };
}

/**
 * Ensure the active layer ID is valid, returning a fallback if not
 */
export function ensureActiveLayerId(
  layers: Layer[],
  currentId: string
): string {
  const has = layers.some((l) => l.id === currentId);
  if (has && layers.length > 0) {
    return currentId;
  }
  return layers.length > 0 ? layers[0].id : generateLayerId();
}

/**
 * Draw a path stroke on the given canvas context
 */
export function drawPathOnContext(
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

/**
 * Generate an asynchronous canvas screenshot from layers (supports both vector and image layers)
 */
export async function getCanvasScreenshotAsync(
  layers: Layer[],
  width: number,
  height: number,
  dprInput?: number
): Promise<string> {
  const dpr = Math.max(
    1,
    Math.floor(
      dprInput ??
        (typeof window !== "undefined"
          ? window.devicePixelRatio !== 0 && !isNaN(window.devicePixelRatio)
            ? window.devicePixelRatio
            : 1
          : 1)
    )
  );
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width * dpr));
  off.height = Math.max(1, Math.floor(height * dpr));
  const ctx = off.getContext("2d");
  if (ctx == null) {
    return "";
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Per-layer compositing to keep erase strokes scoped to their own layer
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = off.width;
  layerCanvas.height = off.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (layerCtx == null) {
    return "";
  }
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layerCtx.lineJoin = "round";
  layerCtx.lineCap = "round";
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    if (layer.type === "background") {
      layerCtx.save();
      layerCtx.fillStyle = layer.color;
      layerCtx.fillRect(0, 0, width, height);
      layerCtx.restore();
    } else if (layer.type === "image") {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = layer.imageSrc;
      await img.decode().catch(() => undefined);
      let { x, y, width: w, height: h } = layer;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof w !== "number" ||
        typeof h !== "number"
      ) {
        // aspect-fit into provided width/height
        const imageAspectRatio = img.height !== 0 ? img.width / img.height : 1;
        const canvasAspectRatio = height !== 0 ? width / height : 1;
        if (imageAspectRatio > canvasAspectRatio) {
          w = width;
          h = width / imageAspectRatio;
          x = 0;
          y = (height - h) / 2;
        } else {
          h = height;
          w = height * imageAspectRatio;
          x = (width - w) / 2;
          y = 0;
        }
      }
      layerCtx.drawImage(img, x, y, w, h);
    } else {
      const dx = layer.offsetX ?? 0;
      const dy = layer.offsetY ?? 0;
      layerCtx.save();
      if (dx !== 0 || dy !== 0) {
        layerCtx.translate(dx, dy);
      }
      for (const stroke of layer.strokes) {
        drawPathOnContext(layerCtx, stroke);
      }
      layerCtx.restore();
    }
    ctx.drawImage(layerCanvas, 0, 0);
  }
  return off.toDataURL("image/png");
}

