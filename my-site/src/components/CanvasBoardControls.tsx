"use client";

import type { JSX, ChangeEvent, RefObject } from "react";
import { memo } from "react";
import type { BoardMode, Layer } from "./CanvasBoard";
import LayerControls from "./LayerControls";
import { GenerateControls } from "./GenerateControls";
import { LoadingAnimation } from "./LoadingAnimation";
import {
  Pencil,
  Eraser,
  Palette,
  RotateCcw,
  RotateCw,
  Camera,
  Settings,
  Move as MoveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      className={`${
        isCollapsed
          ? "p-0 h-16 w-16 flex items-center justify-center"
          : "px-4 py-3"
      }`}
    >
      <CardTitle
        className={`flex items-center justify-between w-full ${
          isCollapsed ? "text-sm" : "text-base"
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-2"
          }`}
        >
          <div className="flex-shrink-0">{icon}</div>
          {!isCollapsed && <span>{title}</span>}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(panel)}
            className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors flex items-center justify-center"
            title={`Collapse ${title}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
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
      {/* Banana Generation Loading Animation */}
      <LoadingAnimation isGenerating={state.isGenerating} />

      {/* Left column: Tools, Actions, Preview */}
      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Tools Card */}
          <Card
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.tools ? "w-16 h-16 cursor-pointer" : "w-80"
            }`}
            onClick={
              state.panelsCollapsed.tools
                ? () => actions.togglePanelCollapsed("tools")
                : undefined
            }
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
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.actions
                ? "w-16 h-16 cursor-pointer"
                : "w-80"
            }`}
            onClick={
              state.panelsCollapsed.actions
                ? () => actions.togglePanelCollapsed("actions")
                : undefined
            }
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
              className={`shadow-lg transition-all duration-200 ${
                state.panelsCollapsed.actions
                  ? "w-16 h-16 cursor-pointer"
                  : "w-80"
              }`}
              onClick={
                state.panelsCollapsed.actions
                  ? () => actions.togglePanelCollapsed("actions")
                  : undefined
              }
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

      {/* Banana AI Generation Controls */}
      <GenerateControls
        isGenerating={state.isGenerating}
        bananaPrompt={state.bananaPrompt}
        isCollapsed={state.panelsCollapsed.banana}
        onGenerateBanana={actions.generateBanana}
        onSetBananaPrompt={actions.setBananaPrompt}
        onToggleCollapsed={() => actions.togglePanelCollapsed("banana")}
      />
    </>
  );
}

const CanvasBoardControls = memo(CanvasBoardControlsBase);
export default CanvasBoardControls;
