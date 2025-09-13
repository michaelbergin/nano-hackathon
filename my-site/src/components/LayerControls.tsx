"use client";

import type { JSX, ChangeEvent, CSSProperties, RefObject } from "react";
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
import type { DragEndEvent } from "@dnd-kit/core";
import {
  Eye,
  EyeOff,
  X,
  GripVertical,
  Layers,
  Plus,
  ChevronDown,
  Image as ImageIcon,
  Banana,
  MoreVertical,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CollapsedControl from "./CollapsedControl";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Layer } from "./CanvasBoard";

interface CollapsibleCardHeaderProps {
  title: string;
  icon: JSX.Element;
  isCollapsed: boolean;
  onToggle: () => void;
  onDownload?: () => Promise<void>;
  onUpload?: () => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
}

function CollapsibleCardHeader({
  title,
  icon,
  onToggle,
  onDownload,
  onUpload,
}: CollapsibleCardHeaderProps): JSX.Element {
  return (
    <CardHeader className="px-4 py-3">
      <CardTitle className="flex items-center justify-between w-full text-sm font-medium">
        <div className="flex items-center min-w-0 flex-1 gap-2">
          <div className="flex-shrink-0">{icon}</div>
          <span className="truncate text-foreground/90">{title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onDownload()}
              className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {onUpload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUpload}
              className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors"
              title="Upload Image"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors flex items-center justify-center"
            title={`Collapse ${title}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </CardTitle>
    </CardHeader>
  );
}

export interface LayerControlsProps {
  layers: Layer[];
  activeLayerId: string;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onAddLayer: (name?: string) => void;
  onRemoveLayer: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onClearLayer: (id: string) => void;
  onReorderLayers: (orderTopToBottom: string[]) => void;
  onSetBackgroundColor?: (id: string, color: string) => void;
  onDownload?: () => Promise<void>;
  onUpload?: () => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
}

function LayerControlsBase({
  layers,
  activeLayerId,
  isCollapsed,
  onToggleCollapsed,
  onAddLayer,
  onRemoveLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  onClearLayer,
  onReorderLayers,
  onSetBackgroundColor,
  onDownload,
  onUpload,
  fileInputRef,
}: LayerControlsProps): JSX.Element {
  // Display top-most layer first in UI (top -> bottom)
  const layersTopToBottom = [...layers].reverse();

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
    onReorderLayers(nextIds);
  };

  return (
    <CollapsedControl
      open={!isCollapsed}
      onOpen={onToggleCollapsed}
      onClose={onToggleCollapsed}
      alignment="top-right"
      collapsedClassName="w-16 h-16"
      expandedClassName="w-80"
      collapsed={
        <Card collapsed className="w-16 h-16 p-0 cursor-pointer shadow-lg flex items-center justify-center">
          <Layers className="h-5 w-5" />
        </Card>
      }
      expanded={
        <Card className="shadow-lg border bg-background/95 backdrop-blur-sm overflow-hidden select-none max-h-[60vh] flex flex-col">
          <CollapsibleCardHeader
            title="Layers"
            icon={<Layers className="h-4 w-4" />}
            isCollapsed={false}
            onToggle={onToggleCollapsed}
            onDownload={onDownload}
            onUpload={onUpload}
            fileInputRef={fileInputRef}
          />
          <CardContent className="px-4 pb-3 pt-0 gap-2 flex-1 min-h-0 flex flex-col">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={layersTopToBottom.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-1">
                  <div className="space-y-1">
                    {layersTopToBottom.map((layer) => {
                      const isActive = layer.id === activeLayerId;
                      return (
                        <SortableLayerRow
                          key={layer.id}
                          id={layer.id}
                          isActive={isActive}
                          layer={layer}
                          onSelect={onSelectLayer}
                          onToggleVisibility={onToggleLayerVisibility}
                          onRemove={onRemoveLayer}
                          onClear={onClearLayer}
                          canRemove={layers.length > 1}
                          onSetBackgroundColor={onSetBackgroundColor}
                        />
                      );
                    })}
                  </div>
                </div>
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddLayer()}
              className="w-full h-9 text-sm font-medium border-dashed hover:border-solid transition-all duration-200 hover:bg-muted/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Layer
            </Button>
          </CardContent>
        </Card>
      }
    />
  );
}

export default LayerControlsBase;

interface SortableLayerRowProps {
  id: string;
  isActive: boolean;
  layer: Layer;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: (id: string) => void;
  canRemove: boolean;
  onSetBackgroundColor?: (id: string, color: string) => void;
}

function SortableLayerRow({
  id,
  isActive,
  layer,
  onSelect,
  onToggleVisibility,
  onRemove,
  onClear,
  canRemove,
  onSetBackgroundColor,
}: SortableLayerRowProps): JSX.Element {
  const isBackground = layer.type === "background";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isBackground });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1.5 p-2 rounded-lg border transition-all duration-200 ${
        isActive
          ? "bg-primary/8 border-primary/30 shadow-sm"
          : "bg-muted/30 hover:bg-muted/60 border-border/50 hover:border-border"
      } ${isDragging ? "opacity-60 shadow-lg scale-105" : ""}`}
    >
      {/* Drag Handle */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 flex-shrink-0 transition-colors ${
          isBackground
            ? "cursor-not-allowed opacity-40"
            : "cursor-grab active:cursor-grabbing hover:bg-muted/80 group-hover:opacity-70"
        }`}
        title={
          isBackground ? "Background cannot be reordered" : "Drag to reorder"
        }
        suppressHydrationWarning
        {...(!isBackground ? attributes : {})}
        {...(!isBackground ? listeners : {})}
        disabled={isBackground}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </Button>

      {/* Layer Selection Button - Main Content */}
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onSelect(id)}
        className="flex-1 justify-start text-left h-7 px-2 min-w-0 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {layer.type === "image" && !("banana" in layer && layer.banana) && (
            <ImageIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
          )}
          {"banana" in layer && layer.banana && (
            <Banana className="h-3 w-3 text-yellow-500 flex-shrink-0" />
          )}
          <span className="truncate text-xs font-medium text-foreground/90 select-none">
            {layer.name}
          </span>
        </div>
      </Button>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isBackground ? (
          <div
            className="h-7 w-7 rounded border border-border/50 overflow-hidden flex-shrink-0"
            title="Background color"
          >
            <Input
              type="color"
              value={layer.color}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onSetBackgroundColor?.(id, e.target.value)
              }
              className="h-full w-full p-0 border-0 cursor-pointer"
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(id)}
            className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors"
            title={layer.visible ? "Hide layer" : "Show layer"}
          >
            {layer.visible ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground/60" />
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted/80 transition-colors opacity-60 group-hover:opacity-100"
              title="Layer options"
            >
              <MoreVertical className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 p-1" sideOffset={4}>
            <DropdownMenuItem
              onClick={() => onClear(id)}
              className="text-xs py-2 px-3 cursor-pointer hover:bg-muted/80"
            >
              <Trash2 className="h-3 w-3 mr-2 text-muted-foreground" />
              Clear Layer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRemove(id)}
              disabled={!canRemove}
              className="text-xs py-2 px-3 cursor-pointer hover:bg-muted/80 text-destructive focus:text-destructive disabled:opacity-50"
            >
              <X className="h-3 w-3 mr-2" />
              Delete Layer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
