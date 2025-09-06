"use client";

import type { JSX, ChangeEvent, RefObject } from "react";
import { memo } from "react";
import type { BoardMode, Layer, ImageLayer } from "./CanvasBoard";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type CanvasControlsState = {
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  layers: Layer[];
  activeLayerId: string;
  compositeDataUrl: string | null;
  isGenerating: boolean;
  bananaPrompt: string;
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
  downloadComposite: () => Promise<void>;
  openUpload: () => void;
  generateBanana: () => Promise<void>;
  setBananaPrompt: (prompt: string) => void;
};

export interface CanvasBoardControlsProps {
  state: CanvasControlsState;
  actions: CanvasControlsActions;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

function CanvasBoardControlsBase({
  state,
  actions,
  fileInputRef,
}: CanvasBoardControlsProps): JSX.Element {
  const drawActive = state.mode === "draw";
  const activeLayerId = state.activeLayerId;

  return (
    <>
      {/* Left column: Tools, Actions, Preview */}
      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                  variant={drawActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => actions.setMode("draw")}
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Draw
                </Button>
                <Button
                  variant={!drawActive ? "default" : "outline"}
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      actions.setColor(e.target.value)
                    }
                    className="h-8 w-12 p-1 border rounded"
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
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        actions.setBrushSize(Number(e.target.value))
                      }
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {state.brushSize}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void actions.downloadComposite();
                  }}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>

              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actions.openUpload}
                  className="w-full text-xs"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Upload Image
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.compositeDataUrl}
                  alt="Canvas screenshot"
                  className="w-full h-auto rounded-md border"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Layers menu at top right */}
      <div className="pointer-events-none absolute top-4 right-4 z-10">
        <div className="pointer-events-auto">
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-2">
                {state.layers.map((layer) => {
                  const isActive = layer.id === activeLayerId;
                  return (
                    <div
                      key={layer.id}
                      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                        isActive
                          ? "bg-primary/10 border-primary/20"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => actions.selectLayer(layer.id)}
                        className="flex-1 justify-start text-left h-8 px-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isActive
                                ? "bg-primary-foreground"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <span className="truncate text-sm">{layer.name}</span>
                          {layer.type === "image" && (
                            <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          )}
                          {(layer as ImageLayer).banana && (
                            <Banana className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => actions.toggleLayerVisibility(layer.id)}
                        className="h-8 w-8 p-0"
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => actions.removeLayer(layer.id)}
                        disabled={state.layers.length <= 1}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete layer"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.addLayer()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Layer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Banana AI card at bottom right */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10">
        <div className="pointer-events-auto">
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banana className="h-4 w-4" />
                Banana AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={actions.generateBanana}
                disabled={state.isGenerating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              >
                <Banana className="h-4 w-4 mr-2" />
                {state.isGenerating ? "Generating…" : "Generate Banana Layer"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="bananaPrompt" className="text-sm font-medium">
                  Prompt
                </Label>
                <Textarea
                  id="bananaPrompt"
                  placeholder="banana-fy this image"
                  value={state.bananaPrompt}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    actions.setBananaPrompt(e.target.value)
                  }
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

const CanvasBoardControls = memo(CanvasBoardControlsBase);
export default CanvasBoardControls;
