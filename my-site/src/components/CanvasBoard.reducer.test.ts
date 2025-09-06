import { describe, it, expect } from "vitest";
import type {
  BoardState,
  PathStroke,
  VectorLayer,
  ImageLayer,
  Layer,
} from "./CanvasBoard";
import { boardReducer, createLayer } from "./canvasUtils";

function initialState(): BoardState {
  const layer = createLayer("Layer 1");
  return {
    layers: [layer],
    activeLayerId: layer.id,
    mode: "draw",
    strokeColor: "#111827",
    brushSize: 4,
    compositeDataUrl: null,
  };
}

describe("CanvasBoard reducer", () => {
  it("adds a new vector layer and selects it", () => {
    const s1 = initialState();
    const s2 = boardReducer(s1, { type: "ADD_LAYER" });
    expect(s2.layers.length).toBe(2);
    expect(s2.layers[1].type).toBe("vector");
    expect(s2.activeLayerId).toBe(s2.layers[1].id);
  });

  it("selects a layer and ensures it is visible", () => {
    const s1 = initialState();
    const hidden = { ...s1.layers[0], visible: false } as VectorLayer;
    const sHidden: BoardState = { ...s1, layers: [hidden] };
    const s2 = boardReducer(sHidden, { type: "SELECT_LAYER", id: hidden.id });
    expect(s2.activeLayerId).toBe(hidden.id);
    expect(s2.layers[0].visible).toBe(true);
  });

  it("removes active layer and selects a valid next one", () => {
    const s1 = initialState();
    const s2 = boardReducer(s1, { type: "ADD_LAYER" });
    const activeId = s2.activeLayerId;
    const s3 = boardReducer(s2, { type: "REMOVE_LAYER", id: activeId });
    expect(s3.layers.length).toBe(1);
    expect(s3.activeLayerId).toBe(s3.layers[0].id);
  });

  it("removing the last layer recreates a new default layer and selects it", () => {
    const s1 = initialState();
    const onlyId = s1.layers[0].id;
    const s2 = boardReducer(s1, { type: "REMOVE_LAYER", id: onlyId });
    expect(s2.layers.length).toBe(1);
    expect(s2.layers[0].type).toBe("vector");
    expect(s2.activeLayerId).toBe(s2.layers[0].id);
  });

  it("ensures active vector layer when current is an image", () => {
    const s1 = initialState();
    const image: ImageLayer = {
      id: "image-1",
      name: "Image",
      visible: true,
      type: "image",
      imageSrc: "https://example.com/a.png",
    };
    const sWithImage: BoardState = {
      ...s1,
      layers: [...s1.layers, image],
      activeLayerId: image.id,
    };
    const s2 = boardReducer(sWithImage, { type: "ENSURE_ACTIVE_VECTOR_LAYER" });
    const active = s2.layers.find((l) => l.id === s2.activeLayerId) as
      | Layer
      | undefined;
    expect(active).toBeDefined();
    expect(active && active.type).toBe("vector");
  });

  it("adds stroke to active vector layer only", () => {
    const s1 = initialState();
    const stroke: PathStroke = {
      points: [0, 0, 1, 1],
      color: "#000",
      size: 2,
      erase: false,
    };
    const s2 = boardReducer(s1, { type: "ADD_STROKE_TO_ACTIVE", stroke });
    const active = s2.layers.find(
      (l) => l.id === s2.activeLayerId
    ) as VectorLayer;
    expect(active.strokes.length).toBe(1);
  });
});
