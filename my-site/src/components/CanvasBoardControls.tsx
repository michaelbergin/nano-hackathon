"use client";

import type { JSX } from "react";
import { memo } from "react";
import type { BoardMode, Layer } from "./CanvasBoard";
import {
  Pencil,
  Eraser,
  Palette,
  Trash2,
  RotateCcw,
  Camera,
  Download,
  Upload,
  Plus,
  Eye,
  EyeOff,
  X,
  Banana,
  Layers,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CanvasControlsState = {
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  layers: Layer[];
  activeLayerId: string;
  compositeDataUrl: string | null;
  isGenerating?: boolean;
};

export type CanvasControlsActions = {
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setMode: (mode: BoardMode) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  clearActive: () => void;
  clearAll: () => void;
  captureComposite: () => void;
  generateBanana: () => Promise<void>;
};

export interface CanvasBoardControlsProps {
  state: CanvasControlsState;
  actions: CanvasControlsActions;
}

function CanvasBoardControlsBase({
  state,
  actions,
}: CanvasBoardControlsProps): JSX.Element {
  return (
    <>
      {/* Left column: Tools, Actions (without Generate), Preview */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Tools Card */}
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={state.mode === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => actions.setMode("draw")}
                className="flex-1"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Draw
              </Button>
              <Button
                variant={state.mode === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => actions.setMode("erase")}
                className="flex-1"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Erase
              </Button>
            </div>

            {/* Brush Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Color</Label>
                <Input
                  type="color"
                  value={state.strokeColor}
                  onChange={(e) => actions.setColor(e.target.value)}
                  className="h-8 w-12 p-1 border rounded"
                  aria-label="Brush color"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: state.strokeColor }}
                  />
                </div>
                <Label className="text-sm font-medium flex-1">Size</Label>
                <div className="flex items-center gap-2 min-w-0">
                  <Input
                    type="range"
                    min={1}
                    max={24}
                    value={state.brushSize}
                    onChange={(e) =>
                      actions.setBrushSize(Number(e.target.value))
                    }
                    className="flex-1"
                    aria-label="Brush size"
                  />
                  <span className="text-xs text-muted-foreground w-6 text-right">
                    {state.brushSize}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card (Generate moved to right column) */}
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={actions.clearActive}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear Active
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={actions.clearAll}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={actions.captureComposite}
                className="text-xs"
              >
                <Camera className="h-3 w-3 mr-1" />
                Screenshot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {state.compositeDataUrl && (
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={state.compositeDataUrl}
                alt="Canvas screenshot"
                className="w-full h-auto rounded-md border"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column: Layers and Generate, vertically centered */}
      <div className="absolute right-4 top-1/2 z-10 flex w-80 -translate-y-1/2 flex-col gap-4">
        {/* Layers Card */}
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Layers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.addLayer()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Layer
            </Button>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {state.layers.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                    state.activeLayerId === l.id
                      ? "bg-primary/10 border-primary/20"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <Button
                    variant={state.activeLayerId === l.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => actions.selectLayer(l.id)}
                    className="flex-1 justify-start text-left h-8 px-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          state.activeLayerId === l.id
                            ? "bg-primary-foreground"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <span className="truncate text-sm">{l.name}</span>
                      {l.type === "image" && (
                        <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => actions.toggleLayerVisibility(l.id)}
                    className="h-8 w-8 p-0"
                    title={l.visible ? "Hide layer" : "Show layer"}
                  >
                    {l.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => actions.removeLayer(l.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete layer"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Card */}
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banana className="h-4 w-4" />
              Generate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.generateBanana}
              disabled={Boolean(state.isGenerating)}
              className="w-full"
            >
              {state.isGenerating ? "Generating…" : "Generate"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const CanvasBoardControls = memo(CanvasBoardControlsBase);
export default CanvasBoardControls;
