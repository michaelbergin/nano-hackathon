"use client";

import type { JSX, ChangeEvent, RefObject } from "react";
import { memo } from "react";
import { createPortal } from "react-dom";
import type { BoardMode, Layer } from "./CanvasBoard";
import LayerControls from "./LayerControls";
import {
  Pencil,
  Eraser,
  Palette,
  RotateCcw,
  RotateCw,
  Camera,
  Banana,
  Settings,
  Move as MoveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

export type CanvasControlsState = {
  mode: BoardMode;
  strokeColor: string;
  brushSize: number;
  compositeDataUrl: string | null;
  isGenerating: boolean;
  bananaPrompt: string;
  panelsCollapsed: {
    tools: boolean;
    actions: boolean;
    banana: boolean;
  };
  canUndo: boolean;
  canRedo: boolean;
};

export type CanvasControlsActions = {
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
  togglePanelCollapsed: (
    panel: keyof CanvasControlsState["panelsCollapsed"]
  ) => void;
  undo: () => void;
  redo: () => void;
};

export interface CanvasBoardControlsProps {
  state: CanvasControlsState;
  actions: CanvasControlsActions;
  fileInputRef: RefObject<HTMLInputElement | null>;
  layers: Layer[];
  activeLayerId: string;
  layerActions: {
    addLayer: (name?: string) => void;
    removeLayer: (id: string) => void;
    selectLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    clearLayer: (id: string) => void;
    reorderLayers: (orderTopToBottom: string[]) => void;
    setBackgroundColor?: (id: string, color: string) => void;
  };
  layersPanelCollapsed: boolean;
  onToggleLayersPanel: () => void;
}

interface CollapsibleCardHeaderProps {
  title: string;
  icon: JSX.Element;
  panel: keyof CanvasControlsState["panelsCollapsed"];
  isCollapsed: boolean;
  onToggle: (panel: keyof CanvasControlsState["panelsCollapsed"]) => void;
}

function CollapsibleCardHeader({
  title,
  icon,
  panel,
  isCollapsed,
  onToggle,
}: CollapsibleCardHeaderProps): JSX.Element {
  return (
    <CardHeader
      className={`pb-3 ${
        isCollapsed ? "px-2 py-3 h-10 flex items-center justify-center" : ""
      }`}
    >
      <CardTitle
        className={`flex items-center justify-between w-full ${
          isCollapsed ? "text-sm h-full" : "text-base"
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center gap-0" : "gap-3"
          }`}
        >
          {icon}
          {!isCollapsed && <span>{title}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(panel)}
          className={`p-0 hover:bg-muted flex items-center justify-center ${
            isCollapsed ? "h-5 w-5" : "h-6 w-6"
          }`}
          title={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          <ChevronDown
            className={`transition-transform duration-200 ${
              isCollapsed ? "-rotate-90 h-3 w-3" : "h-4 w-4"
            }`}
          />
        </Button>
      </CardTitle>
    </CardHeader>
  );
}

function CanvasBoardControlsBase({
  state,
  actions,
  fileInputRef,
  layers,
  activeLayerId,
  layerActions,
  layersPanelCollapsed,
  onToggleLayersPanel,
}: CanvasBoardControlsProps): JSX.Element {
  const drawActive = state.mode === "draw";

  return (
    <>
      {/* Banana Generation Loading Overlay */}
      {state.isGenerating &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
            <div className="relative w-[320px] h-[320px]">
              {/* Inner ring spinning clockwise */}
              {Array.from({ length: 12 }).map((_, index) => {
                const angle = (index / 12) * 2 * Math.PI;
                const radius = 80;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const delay = index * 0.1;

                return (
                  <div
                    key={`inner-${index}`}
                    className="absolute w-8 h-8 flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="animate-spin"
                      style={{
                        animationDelay: `${delay}s`,
                        animationDuration: "2s",
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                      }}
                    >
                      <Banana
                        className="w-6 h-6 text-yellow-400 drop-shadow-lg"
                        style={{
                          filter: "drop-shadow(0 0 4px rgba(255, 255, 0, 0.6))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Outer ring spinning counter-clockwise */}
              {Array.from({ length: 16 }).map((_, index) => {
                const angle = (index / 16) * 2 * Math.PI;
                const radius = 120;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const delay = index * 0.08;

                return (
                  <div
                    key={`outer-${index}`}
                    className="absolute w-7 h-7 flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="animate-spin"
                      style={{
                        animationDelay: `${delay}s`,
                        animationDuration: "1.6s",
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                        animationDirection: "reverse",
                      }}
                    >
                      <Banana
                        className="w-5 h-5 text-yellow-300 drop-shadow"
                        style={{
                          filter: "drop-shadow(0 0 3px rgba(255, 255, 0, 0.6))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Center pulsing banana */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse">
                  <Banana
                    className="w-12 h-12 text-yellow-300 drop-shadow-2xl"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))",
                    }}
                  />
                </div>
              </div>

              {/* Loading text removed by request */}
            </div>
          </div>,
          document.body
        )}

      {/* Left column: Tools, Actions, Preview */}
      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Tools Card */}
          <Card
            collapsed={state.panelsCollapsed.tools}
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.tools ? "w-16" : "w-80"
            }`}
          >
            <CollapsibleCardHeader
              title="Tools"
              icon={<Settings className="h-4 w-4" />}
              panel="tools"
              isCollapsed={state.panelsCollapsed.tools}
              onToggle={actions.togglePanelCollapsed}
            />
            {!state.panelsCollapsed.tools && (
              <CardContent className="space-y-2">
                {/* Mode Selection */}
                <div className="grid grid-cols-3 gap-1">
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
                    variant={state.mode === "erase" ? "default" : "outline"}
                    size="sm"
                    onClick={() => actions.setMode("erase")}
                    className="flex-1"
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Erase
                  </Button>
                  <Button
                    variant={state.mode === "move" ? "default" : "outline"}
                    size="sm"
                    onClick={() => actions.setMode("move")}
                    className="flex-1"
                  >
                    <MoveIcon className="h-4 w-4 mr-2" />
                    Move
                  </Button>
                </div>

                {/* Brush Settings */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
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

                  <div className="flex items-center gap-1">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: state.strokeColor }}
                      />
                    </div>
                    <Label className="text-sm font-medium flex-1">Size</Label>
                    <div className="flex items-center gap-1 min-w-0">
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

                {/* Undo/Redo Controls */}
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.undo}
                    disabled={!state.canUndo}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.redo}
                    disabled={!state.canRedo}
                    className="text-xs"
                  >
                    <RotateCw className="h-3 w-3 mr-1" />
                    Redo
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Actions Card */}
          <Card
            collapsed={state.panelsCollapsed.actions}
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.actions ? "w-16" : "w-80"
            }`}
          >
            <CollapsibleCardHeader
              title="Actions"
              icon={<Camera className="h-4 w-4" />}
              panel="actions"
              isCollapsed={state.panelsCollapsed.actions}
              onToggle={actions.togglePanelCollapsed}
            />
            {!state.panelsCollapsed.actions && (
              <CardContent className="space-y-1">
                <div className="grid grid-cols-1 gap-1">
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
            )}
          </Card>

          {/* Preview Card */}
          {state.compositeDataUrl && (
            <Card
              collapsed={state.panelsCollapsed.actions}
              className={`shadow-lg transition-all duration-200 ${
                state.panelsCollapsed.actions ? "w-16" : "w-80"
              }`}
            >
              <CollapsibleCardHeader
                title="Preview"
                icon={<Camera className="h-4 w-4" />}
                panel="actions" // Use actions panel since preview is part of actions
                isCollapsed={state.panelsCollapsed.actions}
                onToggle={actions.togglePanelCollapsed}
              />
              {!state.panelsCollapsed.actions && (
                <CardContent>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.compositeDataUrl}
                    alt="Canvas screenshot"
                    className="w-full h-auto rounded-md border"
                  />
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Layers menu at top right */}
      <div className="pointer-events-none absolute top-4 right-4 z-10">
        <div className="pointer-events-auto overflow-hidden">
          <LayerControls
            layers={layers}
            activeLayerId={activeLayerId}
            isCollapsed={layersPanelCollapsed}
            onToggleCollapsed={onToggleLayersPanel}
            onAddLayer={layerActions.addLayer}
            onRemoveLayer={layerActions.removeLayer}
            onSelectLayer={layerActions.selectLayer}
            onToggleLayerVisibility={layerActions.toggleLayerVisibility}
            onClearLayer={layerActions.clearLayer}
            onReorderLayers={layerActions.reorderLayers}
            onSetBackgroundColor={layerActions.setBackgroundColor}
            onDownload={actions.downloadComposite}
            onUpload={actions.openUpload}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>

      {/* Banana AI card at bottom right */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10">
        <div className="pointer-events-auto">
          <Card
            collapsed={state.panelsCollapsed.banana}
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.banana ? "w-16" : "w-80"
            }`}
          >
            <CollapsibleCardHeader
              title="Banana AI"
              icon={<Banana className="h-4 w-4" />}
              panel="banana"
              isCollapsed={state.panelsCollapsed.banana}
              onToggle={actions.togglePanelCollapsed}
            />
            {!state.panelsCollapsed.banana && (
              <CardContent className="space-y-1">
                <Button
                  onClick={actions.generateBanana}
                  disabled={state.isGenerating}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                >
                  <Banana className="h-4 w-4 mr-2" />
                  {state.isGenerating ? "Generating…" : "Generate Banana Layer"}
                </Button>

                <div className="space-y-1">
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
                    rows={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const CanvasBoardControls = memo(CanvasBoardControlsBase);
export default CanvasBoardControls;
