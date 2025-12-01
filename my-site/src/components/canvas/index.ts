/**
 * Canvas utilities and hooks
 * Extracted from CanvasBoard for better organization
 */

export {
  getLayerBounds,
  hitTestLayers,
  drawBackgroundLayer,
  drawImageLayer,
  drawVectorLayer,
  drawSelectionOverlay,
  getRelativePoint,
  resizeCanvasToContainer,
  setupOffscreenCanvas,
} from "./canvasRendering";

export {
  useCanvasRenderer,
  type CanvasRendererState,
  type UseCanvasRendererReturn,
} from "./useCanvasRenderer";

export {
  useCanvasPointers,
  type DragInfo,
  type UseCanvasPointersOptions,
  type UseCanvasPointersReturn,
} from "./useCanvasPointers";
