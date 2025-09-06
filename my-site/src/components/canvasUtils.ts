import type {
  BoardState,
  BoardAction,
  Layer,
  VectorLayer,
  ImageLayer,
  PathStroke,
} from "./CanvasBoard";

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
 * Generate a synchronous canvas screenshot from layers
 */
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
  // Per-layer compositing using an intermediate canvas ensures erasing remains scoped to the layer
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = off.width;
  layerCanvas.height = off.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) {
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
    if (layer.type === "image") {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = layer.imageSrc;
      let { x, y, width: w, height: h } = layer;
      // We cannot await decode here; draw will be a no-op if not yet loaded
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        if (
          typeof x !== "number" ||
          typeof y !== "number" ||
          typeof w !== "number" ||
          typeof h !== "number"
        ) {
          const imageAspectRatio = img.width / img.height || 1;
          const canvasAspectRatio = width / height || 1;
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
        layerCtx.drawImage(img, x as number, y as number, w as number, h as number);
      }
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
  // Per-layer compositing to keep erase strokes scoped to their own layer
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = off.width;
  layerCanvas.height = off.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) {
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
    if (layer.type === "image") {
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
        const imageAspectRatio = img.width / img.height || 1;
        const canvasAspectRatio = width / height || 1;
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
      layerCtx.drawImage(img, x as number, y as number, w as number, h as number);
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
    case "MOVE_LAYER": {
      const next = {
        ...state,
        layers: state.layers.map((l) => {
          if (l.id !== action.id) return l;
          if (l.type === "vector") {
            const ox = (l.offsetX ?? 0) + action.dx;
            const oy = (l.offsetY ?? 0) + action.dy;
            return { ...l, offsetX: ox, offsetY: oy } as VectorLayer;
          }
          const x = (l.x ?? 0) + action.dx;
          const y = (l.y ?? 0) + action.dy;
          return { ...l, x, y } as ImageLayer;
        }),
      };
      log("MOVE_LAYER", { id: action.id, dx: action.dx, dy: action.dy });
      return next;
    }
    case "SET_IMAGE_BOUNDS": {
      const next = {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id && l.type === "image"
            ? { ...l, x: action.x, y: action.y, width: action.width, height: action.height }
            : l
        ),
      };
      log("SET_IMAGE_BOUNDS", { id: action.id });
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
    case "REORDER_LAYERS": {
      // action.order is bottom->top id order to match draw order
      const idToLayer = new Map(state.layers.map((l) => [l.id, l] as const));
      const ordered: Layer[] = [];
      for (const id of action.order) {
        const layer = idToLayer.get(id);
        if (layer) {
          ordered.push(layer);
          idToLayer.delete(id);
        }
      }
      // Append any layers not present in payload, preserving existing relative order
      for (const l of state.layers) {
        if (idToLayer.has(l.id)) {
          ordered.push(l);
        }
      }
      const next = { ...state, layers: ordered };
      log("REORDER_LAYERS", {
        order: ordered.map((l) => l.id),
        active: next.activeLayerId,
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
