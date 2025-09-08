"use client";

import type { JSX, ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Banana, Wand2, ChevronDown } from "lucide-react";
import {
  Sparkles,
  Paintbrush,
  Rocket,
  Cloud,
  Rainbow,
  Sun,
  Moon,
  Bug,
  Dog,
  Fish,
  Mic,
} from "lucide-react";

interface CollapsibleCardHeaderProps {
  title: string;
  icon: JSX.Element;
  panel: keyof { banana: boolean };
  isCollapsed: boolean;
  onToggle: (panel: keyof { banana: boolean }) => void;
}

function CollapsibleCardHeader({
  title,
  icon,
  panel,
  isCollapsed,
  onToggle,
}: CollapsibleCardHeaderProps): JSX.Element {
  return (
    <div
      className={`${
        isCollapsed
          ? "p-0 h-16 w-16 flex items-center justify-center"
          : "px-4 py-3"
      }`}
    >
      <div
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
      </div>
    </div>
  );
}

interface GenerateControlsProps {
  isGenerating: boolean;
  bananaPrompt: string;
  isCollapsed: boolean;
  onGenerateBanana: () => Promise<void>;
  onSetBananaPrompt: (prompt: string) => void;
  onToggleCollapsed: () => void;
}

export function GenerateControls({
  isGenerating,
  bananaPrompt,
  isCollapsed,
  onGenerateBanana,
  onSetBananaPrompt,
  onToggleCollapsed,
}: GenerateControlsProps): JSX.Element {
  // Minimal SpeechRecognition typing to avoid relying on non-standard DOM types
  interface MinimalSpeechRecognitionEventResultItem {
    transcript: string;
  }
  interface MinimalSpeechRecognitionEventResult {
    isFinal: boolean;
    0: MinimalSpeechRecognitionEventResultItem;
  }
  interface MinimalSpeechRecognitionEvent {
    results: ArrayLike<MinimalSpeechRecognitionEventResult>;
  }
  interface MinimalSpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  }
  type MinimalSpeechRecognitionCtor = new () => MinimalSpeechRecognition;

  const getSpeechRecognitionCtor = (): MinimalSpeechRecognitionCtor | null => {
    if (typeof window === "undefined") {
      return null;
    }
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | MinimalSpeechRecognitionCtor
      | undefined;
    return Ctor ?? null;
  };

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const promptRef = useRef<string>(bananaPrompt);

  useEffect(() => {
    promptRef.current = bananaPrompt;
  }, [bananaPrompt]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current !== null) {
        try {
          recognitionRef.current.abort();
        } catch {
          // noop
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleMicClick = (): void => {
    if (isRecording) {
      if (recognitionRef.current !== null) {
        try {
          recognitionRef.current.stop();
        } catch {
          // noop
        }
      }
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (Ctor === null) {
      // Fallback: notify via console; could be enhanced with a toast
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: MinimalSpeechRecognitionEvent): void => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript.trim().length > 0) {
        const base = promptRef.current.trim();
        const next =
          base.length > 0 ? `${base} ${finalTranscript}` : finalTranscript;
        onSetBananaPrompt(next);
      }
    };

    recognition.onend = (): void => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (): void => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const shortcuts = useMemo(
    () => [
      {
        key: "magic-colors",
        label: "Magic Colors",
        icon: <Sparkles className="h-4 w-4" />,
        prompt:
          "make the drawing pop with bright, bold colors and gentle glow, keep shapes clear for kids",
      },
      {
        key: "clean-lines",
        label: "Clean Lines",
        icon: <Paintbrush className="h-4 w-4" />,
        prompt:
          "neaten sketch lines, smooth edges, cartoon style, keep original idea and layout",
      },
      // {
      //   key: "sparkly-stars",
      //   label: "Sparkly Stars",
      //   icon: <Stars className="h-4 w-4" />,
      //   prompt: "add cute sparkly stars and soft shine around the main subject",
      // },
      {
        key: "rainbow",
        label: "Rainbow",
        icon: <Rainbow className="h-4 w-4" />,
        prompt:
          "if the sketch is a rainbow shape, enrich the sketch, if not, add a cheerful rainbow and soft clouds in the background of the main object",
      },
      {
        key: "sky-day",
        label: "Sunny Day",
        icon: <Sun className="h-4 w-4" />,
        prompt: "bright blue sky, puffy clouds, warm sunshine, happy colors",
      },
      {
        key: "sky-night",
        label: "Night Sky",
        icon: <Moon className="h-4 w-4" />,
        prompt: "cozy night sky with gentle moon and friendly twinkling stars",
      },
      // {
      //   key: "garden",
      //   label: "Flower Garden",
      //   icon: <Flower className="h-4 w-4" />,
      //   prompt: "add colorful flowers and soft grass, friendly storybook style",
      // },
      // {
      //   key: "castle",
      //   label: "Castle",
      //   icon: <Castle className="h-4 w-4" />,
      //   prompt:
      //     "add a cute fairytale castle in the distance, bright and simple",
      // },
      {
        key: "rocket",
        label: "Rocket Ship",
        icon: <Rocket className="h-4 w-4" />,
        prompt: "add a playful rocket ship and stars, fun space adventure vibe",
      },
      {
        key: "animal-friends",
        label: "Animal Friends",
        icon: <Dog className="h-4 w-4" />,
        prompt:
          "add friendly animal friends (puppy, kitten, bunny) smiling, simple cartoon style",
      },
      {
        key: "undersea",
        label: "Undersea",
        icon: <Fish className="h-4 w-4" />,
        prompt:
          "make a cheerful undersea scene with fish and bubbles, bright colors",
      },
      {
        key: "clouds",
        label: "Clouds",
        icon: <Cloud className="h-4 w-4" />,
        prompt: "add soft fluffy clouds around, gentle storybook look",
      },
      {
        key: "glitter",
        label: "Magic Sparkles",
        icon: <Wand2 className="h-4 w-4" />,
        prompt: "sprinkle magic sparkles and gentle glow around the drawing",
      },
      {
        key: "cute-bugs",
        label: "Cute Bugs",
        icon: <Bug className="h-4 w-4" />,
        prompt:
          "add tiny cute bugs (ladybugs, butterflies) with friendly faces",
      },
      // {
      //   key: "kitty",
      //   label: "Kitty",
      //   icon: <Cat className="h-4 w-4" />,
      //   prompt: "add a cute kitty with big eyes, soft fur, friendly smile",
      // },
      {
        key: "banana-theme",
        label: "Banana Fun",
        icon: <Banana className="h-4 w-4" />,
        prompt:
          "banana-fy this image with banana characters and fun yellow themes",
      },
    ],
    []
  );
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10">
      <div className="pointer-events-auto select-none">
        <Card
          className={`shadow-lg transition-all duration-200 ${
            isCollapsed ? "w-16 h-16 cursor-pointer" : "w-80"
          }`}
          onClick={isCollapsed ? onToggleCollapsed : undefined}
        >
          <CollapsibleCardHeader
            title="Banana AI"
            icon={<Banana className="h-4 w-4" />}
            panel="banana"
            isCollapsed={isCollapsed}
            onToggle={() => onToggleCollapsed()}
          />
          {!isCollapsed && (
            <CardContent className="px-4 pb-3 pt-0 space-y-2">
              <div className="space-y-1">
                {/* <Label className="text-sm font-medium">Shortcuts</Label> */}
                <div className="grid grid-cols-2 gap-1">
                  {shortcuts.map((s) => (
                    <Button
                      key={s.key}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 text-xs"
                      onClick={() => onSetBananaPrompt(s.prompt)}
                      disabled={isGenerating}
                      title={s.label}
                    >
                      {s.icon}
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bananaPrompt" className="text-sm font-medium">
                  Prompt
                </Label>
                <div className="relative">
                  <Textarea
                    id="bananaPrompt"
                    placeholder="banana-fy this image"
                    value={bananaPrompt}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      onSetBananaPrompt(e.target.value)
                    }
                    className="text-sm resize-none select-text pr-10"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute right-2 top-2 h-6 w-6 p-0 hover:bg-muted ${
                      isRecording ? "text-red-600 animate-pulse" : ""
                    }`}
                    onClick={handleMicClick}
                    disabled={isGenerating}
                    title={isRecording ? "Stop recording" : "Start voice input"}
                    aria-pressed={isRecording}
                  >
                    <Mic className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={onGenerateBanana}
                disabled={isGenerating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating…" : "Transform"}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
