"use client";

import type { JSX } from "react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Layers, Wand2 } from "lucide-react";
import type { Layer } from "./CanvasBoard";
import { LayerControlsContent } from "./LayerControls";
import { GenerateControlsContent } from "./GenerateControls";

export interface MobileDrawerProps {
  // Layer controls props
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: (name?: string) => void;
  onRemoveLayer: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onClearLayer: (id: string) => void;
  onReorderLayers: (orderTopToBottom: string[]) => void;
  onSetBackgroundColor?: (id: string, color: string) => void;
  // Generate controls props
  isGenerating: boolean;
  bananaPrompt: string;
  onGenerateBanana: () => Promise<void>;
  onSetBananaPrompt: (prompt: string) => void;
}

export function MobileDrawer({
  // Layer props
  layers,
  activeLayerId,
  onAddLayer,
  onRemoveLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  onClearLayer,
  onReorderLayers,
  onSetBackgroundColor,
  // Generate props
  isGenerating,
  bananaPrompt,
  onGenerateBanana,
  onSetBananaPrompt,
}: MobileDrawerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("layers");

  const handleOpenLayers = () => {
    setActiveTab("layers");
    setOpen(true);
  };

  const handleOpenGenerate = () => {
    setActiveTab("generate");
    setOpen(true);
  };

  return (
    <>
      {/* Trigger buttons - bottom-right above palette, only visible on mobile */}
      <div className="pointer-events-none absolute bottom-24 right-4 z-20 md:hidden">
        <div className="pointer-events-auto flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-xl shadow-lg bg-background/95 backdrop-blur-sm border"
            onClick={handleOpenLayers}
            aria-label="Open layers"
          >
            <Layers className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-xl shadow-lg bg-background/95 backdrop-blur-sm border"
            onClick={handleOpenGenerate}
            aria-label="Open generate controls"
          >
            <Wand2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sheet drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[85vw] max-w-80 h-dvh flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <SheetTitle>Controls</SheetTitle>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="mx-4 mb-2 grid w-auto grid-cols-2 flex-shrink-0">
              <TabsTrigger value="layers" className="gap-2">
                <Layers className="h-4 w-4" />
                Layers
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generate
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="layers"
              className="flex-1 overflow-y-auto px-4 pb-4 mt-0 data-[state=inactive]:hidden"
            >
              <LayerControlsContent
                layers={layers}
                activeLayerId={activeLayerId}
                onAddLayer={onAddLayer}
                onRemoveLayer={onRemoveLayer}
                onSelectLayer={onSelectLayer}
                onToggleLayerVisibility={onToggleLayerVisibility}
                onClearLayer={onClearLayer}
                onReorderLayers={onReorderLayers}
                onSetBackgroundColor={onSetBackgroundColor}
              />
            </TabsContent>

            <TabsContent
              value="generate"
              className="flex-1 overflow-y-auto px-4 pb-4 mt-0 data-[state=inactive]:hidden"
            >
              <GenerateControlsContent
                isGenerating={isGenerating}
                bananaPrompt={bananaPrompt}
                onGenerateBanana={onGenerateBanana}
                onSetBananaPrompt={onSetBananaPrompt}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
