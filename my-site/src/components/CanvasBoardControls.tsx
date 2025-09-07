"use client";

import type { JSX, ChangeEvent, RefObject, CSSProperties } from "react";
import { memo, useMemo } from "react";
import type { BoardMode, Layer, ImageLayer } from "./CanvasBoard";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Move as MoveIcon,
  GripVertical,
  ChevronDown,
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
  panelsCollapsed: {
    tools: boolean;
    actions: boolean;
    layers: boolean;
    banana: boolean;
  };
};

export type CanvasControlsActions = {
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  selectLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  reorderLayers: (orderTopToBottom: string[]) => void;
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
};

export interface CanvasBoardControlsProps {
  state: CanvasControlsState;
  actions: CanvasControlsActions;
  fileInputRef: RefObject<HTMLInputElement | null>;
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
}: CanvasBoardControlsProps): JSX.Element {
  const drawActive = state.mode === "draw";
  const activeLayerId = state.activeLayerId;

  // Display top-most layer first in UI (top -> bottom)
  const layersTopToBottom = useMemo(() => {
    return [...state.layers].reverse();
  }, [state.layers]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = layersTopToBottom.map((l) => l.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const nextIds = arrayMove(ids, oldIndex, newIndex);
    actions.reorderLayers(nextIds);
  };

  return (
    <>
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
              <CardContent className="space-y-4">
                {/* Mode Selection */}
                <div className="grid grid-cols-3 gap-2">
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
        <div className="pointer-events-auto">
          <Card
            collapsed={state.panelsCollapsed.layers}
            className={`shadow-lg transition-all duration-200 ${
              state.panelsCollapsed.layers ? "w-16" : "w-80"
            }`}
          >
            <CollapsibleCardHeader
              title="Layers"
              icon={<Layers className="h-4 w-4" />}
              panel="layers"
              isCollapsed={state.panelsCollapsed.layers}
              onToggle={actions.togglePanelCollapsed}
            />
            {!state.panelsCollapsed.layers && (
              <CardContent className="space-y-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={layersTopToBottom.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-2">
                      {layersTopToBottom.map((layer) => {
                        const isActive = layer.id === activeLayerId;
                        return (
                          <SortableLayerRow
                            key={layer.id}
                            id={layer.id}
                            isActive={isActive}
                            layer={layer}
                            onSelect={actions.selectLayer}
                            onToggleVisibility={actions.toggleLayerVisibility}
                            onRemove={actions.removeLayer}
                            canRemove={state.layers.length > 1}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

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
            )}
          </Card>
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
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const CanvasBoardControls = memo(CanvasBoardControlsBase);
export default CanvasBoardControls;

interface SortableLayerRowProps {
  id: string;
  isActive: boolean;
  layer: Layer;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function SortableLayerRow({
  id,
  isActive,
  layer,
  onSelect,
  onToggleVisibility,
  onRemove,
  canRemove,
}: SortableLayerRowProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
        isActive
          ? "bg-primary/10 border-primary/20"
          : "bg-muted/50 hover:bg-muted"
      } ${isDragging ? "opacity-75" : ""}`}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        suppressHydrationWarning
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </Button>

      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={() => onSelect(id)}
        className="flex-1 justify-start text-left h-8 px-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-primary-foreground" : "bg-muted-foreground"
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
        onClick={() => onToggleVisibility(id)}
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
        onClick={() => onRemove(id)}
        disabled={!canRemove}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        title="Delete layer"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
