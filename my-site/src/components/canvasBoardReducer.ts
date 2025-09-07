import type {
  BoardState,
  BoardAction,
  Layer,
  VectorLayer,
  ImageLayer,
  BackgroundLayer,
} from "./CanvasBoard";
import {
  createLayer,
  ensureActiveLayerId,
  generateLayerId,
  createBackgroundLayer,
} from "./canvasUtils";

type BoardSnapshot = {
  layers: Layer[];
  activeLayerId: string;
};

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((l) => {
    if (l.type === "image") {
      return { ...l } as ImageLayer;
    }
    if (l.type === "background") {
      return { ...l } as BackgroundLayer;
    }
    // Deep clone strokes array structure
    return {
      ...l,
      strokes: l.strokes.map((s) => ({ ...s, points: [...s.points] })),
    } as VectorLayer;
  });
}

function makeSnapshot(state: BoardState): BoardSnapshot {
  return {
    layers: cloneLayers(state.layers),
    activeLayerId: state.activeLayerId,
  };
}

function restoreFromSnapshot(
  state: BoardState,
  snap: BoardSnapshot
): BoardState {
  return {
    ...state,
    layers: cloneLayers(snap.layers),
    activeLayerId: snap.activeLayerId,
  };
}

function isUndoable(action: BoardAction): boolean {
  switch (action.type) {
    case "ADD_LAYER":
    case "REMOVE_LAYER":
    case "SELECT_LAYER":
    case "TOGGLE_LAYER_VISIBILITY":
    case "CLEAR_LAYER":
    case "RENAME_LAYER":
    case "REORDER_LAYERS":
    case "ADD_STROKE_TO_ACTIVE":
    case "ADD_IMAGE_LAYER_TOP":
    case "MOVE_LAYER":
    case "SET_IMAGE_BOUNDS":
    case "ENSURE_ACTIVE_VECTOR_LAYER":
    case "CLEAR_ACTIVE_LAYER":
    case "CLEAR_ALL_LAYERS":
    case "SET_BACKGROUND_COLOR":
      return true;
    case "SET_MODE":
    case "SET_COLOR":
    case "SET_BRUSH_SIZE":
    case "LOAD_FROM_DATA":
    case "SET_COMPOSITE":
      return false;
    default:
      return false;
  }
}

export function boardReducer(
  state: BoardState,
  action: BoardAction
): BoardState {
  const log = (message: string, extra?: unknown): void => {
    if (typeof window !== "undefined") {
      console.debug(`[CanvasBoard] ${message}`, extra ?? "");
    }
  };

  // Undo/Redo handled first
  if (action.type === "UNDO") {
    const prev =
      state.past.length > 0 ? state.past[state.past.length - 1] : null;
    if (!prev) {
      return state;
    }
    const newPast = state.past.slice(0, -1);
    const nextFuture = [...state.future, makeSnapshot(state)];
    const restored = restoreFromSnapshot(state, prev);
    const next = { ...restored, past: newPast, future: nextFuture };
    log("UNDO", { past: next.past.length, future: next.future.length });
    return next;
  }
  if (action.type === "REDO") {
    const nextSnap =
      state.future.length > 0 ? state.future[state.future.length - 1] : null;
    if (!nextSnap) {
      return state;
    }
    const newFuture = state.future.slice(0, -1);
    const nextPast = [...state.past, makeSnapshot(state)];
    const restored = restoreFromSnapshot(state, nextSnap);
    const next = { ...restored, past: nextPast, future: newFuture };
    log("REDO", { past: next.past.length, future: next.future.length });
    return next;
  }

  const apply = (draft: BoardState): BoardState => {
    switch (action.type) {
      case "ADD_LAYER": {
        const name = action.name ?? `Layer ${draft.layers.length + 1}`;
        const nextLayer = createLayer(name);
        const next = {
          ...draft,
          layers: [...draft.layers, nextLayer],
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
        const name = action.name ?? `Layer ${draft.layers.length + 1}`;
        const imageLayer: ImageLayer = {
          id: generateLayerId(),
          name,
          visible: true,
          type: "image",
          imageSrc: action.imageSrc,
          banana: action.banana ?? false,
        };
        const next = {
          ...draft,
          layers: [...draft.layers, imageLayer],
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
          ...draft,
          layers: draft.layers.map((l) => {
            if (l.id !== action.id) {
              return l;
            }
            if (l.type === "background") {
              return l;
            }
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
          ...draft,
          layers: draft.layers.map((l) =>
            l.id === action.id && l.type === "image"
              ? {
                  ...l,
                  x: action.x,
                  y: action.y,
                  width: action.width,
                  height: action.height,
                }
              : l
          ),
        };
        log("SET_IMAGE_BOUNDS", { id: action.id });
        return next;
      }
      case "SET_BACKGROUND_COLOR": {
        const next = {
          ...draft,
          layers: draft.layers.map((l) =>
            l.id === action.id && l.type === "background"
              ? ({ ...l, color: action.color } as BackgroundLayer)
              : l
          ),
        };
        log("SET_BACKGROUND_COLOR", { id: action.id, color: action.color });
        return next;
      }
      case "REMOVE_LAYER": {
        const remaining = draft.layers.filter((l) => l.id !== action.id);
        const nextLayers =
          remaining.length > 0 ? remaining : [createLayer("Layer 1")];
        const nextActive = ensureActiveLayerId(
          nextLayers,
          draft.activeLayerId === action.id ? "" : draft.activeLayerId
        );
        const next = {
          ...draft,
          layers: nextLayers,
          activeLayerId: nextActive,
        };
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
        const idToLayer = new Map(draft.layers.map((l) => [l.id, l] as const));
        const backgroundIds = draft.layers
          .filter((l) => l.type === "background")
          .map((l) => l.id);
        const ordered: Layer[] = [];
        // Always place background(s) first (bottom-most) in internal bottom->top order
        for (const id of backgroundIds) {
          const bg = idToLayer.get(id);
          if (bg) {
            ordered.push(bg);
            idToLayer.delete(id);
          }
        }
        // Then follow the order provided, skipping any background ids
        for (const id of action.order) {
          if (backgroundIds.includes(id)) {
            continue;
          }
          const layer = idToLayer.get(id);
          if (layer) {
            ordered.push(layer);
            idToLayer.delete(id);
          }
        }
        // Append any remaining non-background layers preserving their existing relative order
        for (const l of draft.layers) {
          if (idToLayer.has(l.id)) {
            ordered.push(l);
          }
        }
        const next = { ...draft, layers: ordered };
        log("REORDER_LAYERS", {
          order: ordered.map((l) => l.id),
          active: next.activeLayerId,
        });
        return next;
      }
      case "SELECT_LAYER": {
        const nextLayers = draft.layers.map((l) =>
          l.id === action.id ? { ...l, visible: true } : l
        );
        const next = { ...draft, layers: nextLayers, activeLayerId: action.id };
        log("SELECT_LAYER", { active: next.activeLayerId });
        return next;
      }
      case "TOGGLE_LAYER_VISIBILITY": {
        const next = {
          ...draft,
          layers: draft.layers.map((l) =>
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
          ...draft,
          layers: draft.layers.map((l) =>
            l.id === action.id ? { ...l, name: action.name } : l
          ),
        };
        log("RENAME_LAYER", { id: action.id, name: action.name });
        return next;
      }
      case "ADD_STROKE_TO_ACTIVE": {
        const idx = draft.layers.findIndex((l) => l.id === draft.activeLayerId);
        if (idx === -1) {
          return draft;
        }
        const target = draft.layers[idx];
        if (target.type !== "vector") {
          return draft;
        }
        const updated: VectorLayer = {
          ...target,
          strokes: [...target.strokes, action.stroke],
        };
        const nextLayers = draft.layers.slice();
        nextLayers[idx] = updated;
        const next = { ...draft, layers: nextLayers };
        log("ADD_STROKE_TO_ACTIVE", {
          active: next.activeLayerId,
          strokePoints: action.stroke.points.length,
        });
        return next;
      }
      case "ENSURE_ACTIVE_VECTOR_LAYER": {
        const currentIndex = draft.layers.findIndex(
          (l) => l.id === draft.activeLayerId
        );
        const current =
          currentIndex >= 0 ? draft.layers[currentIndex] : undefined;
        if (current && current.type === "vector") {
          return draft;
        }
        const nextLayer = createLayer(`Layer ${draft.layers.length + 1}`);
        const next = {
          ...draft,
          layers: [...draft.layers, nextLayer],
          activeLayerId: nextLayer.id,
        };
        log("ENSURE_ACTIVE_VECTOR_LAYER", { active: next.activeLayerId });
        return next;
      }
      case "CLEAR_LAYER": {
        const nextLayers = draft.layers.map((l) => {
          if (l.id !== action.id) {
            return l;
          }
          if (l.type === "vector") {
            return { ...l, strokes: [] };
          }
          return l;
        });
        const next = { ...draft, layers: nextLayers };
        log("CLEAR_LAYER", { id: action.id });
        return next;
      }
      case "CLEAR_ACTIVE_LAYER": {
        const nextLayers = draft.layers.map((l) => {
          if (l.id !== draft.activeLayerId) {
            return l;
          }
          if (l.type === "vector") {
            return { ...l, strokes: [] };
          }
          return l;
        });
        const next = { ...draft, layers: nextLayers };
        log("CLEAR_ACTIVE_LAYER", { active: next.activeLayerId });
        return next;
      }
      case "CLEAR_ALL_LAYERS": {
        const next = {
          ...draft,
          layers: draft.layers.map((l) =>
            l.type === "vector" ? { ...l, strokes: [] } : l
          ),
        };
        log("CLEAR_ALL_LAYERS");
        return next;
      }
      case "SET_MODE": {
        const next = { ...draft, mode: action.mode };
        log("SET_MODE", { mode: next.mode });
        return next;
      }
      case "SET_COLOR": {
        const next = { ...draft, strokeColor: action.color };
        log("SET_COLOR", { color: next.strokeColor });
        return next;
      }
      case "SET_BRUSH_SIZE": {
        const next = { ...draft, brushSize: action.size };
        log("SET_BRUSH_SIZE", { size: next.brushSize });
        return next;
      }
      case "LOAD_FROM_DATA": {
        const incoming =
          action.layers.length > 0
            ? cloneLayers(action.layers)
            : [createLayer("Layer 1")];
        const hasBackground = incoming.some((l) => l.type === "background");
        const layers = hasBackground
          ? incoming
          : [createBackgroundLayer("#ffffff"), ...incoming];
        const firstDrawable =
          layers.find((l) => l.type !== "background") ?? layers[0];
        const next = {
          ...draft,
          layers,
          activeLayerId: firstDrawable.id,
          past: [],
          future: [],
        };
        log("LOAD_FROM_DATA", {
          active: next.activeLayerId,
          count: layers.length,
        });
        return next;
      }
      case "SET_COMPOSITE": {
        const next = { ...draft, compositeDataUrl: action.dataUrl };
        log("SET_COMPOSITE", { hasData: Boolean(next.compositeDataUrl) });
        return next;
      }
      default: {
        return draft;
      }
    }
  };

  if (isUndoable(action)) {
    const snapshot = makeSnapshot(state);
    const withoutFuture: BoardState = {
      ...state,
      past: [...state.past, snapshot],
      future: [],
    };
    return apply(withoutFuture);
  }

  return apply(state);
}
