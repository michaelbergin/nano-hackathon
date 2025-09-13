"use client";

import type { JSX, RefObject } from "react";
import { memo } from "react";
import type { BoardMode, Layer } from "./CanvasBoard";
import LayerControls from "./LayerControls";
import { GenerateControls } from "./GenerateControls";
import { LoadingAnimation } from "./LoadingAnimation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import ToolControls from "./ToolControls";

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
  // Tools UI moved into ToolControls

  return (
    <>
      {/* Banana Generation Loading Animation */}
      <LoadingAnimation isGenerating={state.isGenerating} />

      {/* Left column: Actions, Preview */}
      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Actions Card */}
          {/* <Card
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
          </Card> */}

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

      {/* Bottom-centered Tool Controls */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center px-4">
        <div className="pointer-events-auto select-none max-w-full overflow-x-auto">
          <ToolControls
            mode={state.mode}
            strokeColor={state.strokeColor}
            brushSize={state.brushSize}
            canUndo={state.canUndo}
            canRedo={state.canRedo}
            setMode={actions.setMode}
            setColor={actions.setColor}
            setBrushSize={actions.setBrushSize}
            undo={actions.undo}
            redo={actions.redo}
          />
        </div>
      </div>

      {/* Layers menu at top right */}
      <div className="pointer-events-none absolute top-4 right-4 z-10">
        <div className="pointer-events-auto">
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
