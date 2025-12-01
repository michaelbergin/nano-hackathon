"use client";

import type { JSX, ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Pencil,
  GraduationCap,
  Compass,
  Fish,
  Users,
  Building2,
  Calculator,
  Divide,
  Plus,
  BookOpen,
  Sparkles,
  Wand2,
  Mic,
} from "lucide-react";
import { useMobile } from "@/hooks/useMobile";

// Re-export types from centralized location for backward compatibility
export type { WorkflowType, WorkflowOption, WorkflowConfig } from "@/types/workflow";

// Import types for local use
import type { WorkflowType, WorkflowConfig } from "@/types/workflow";

const WORKFLOWS: WorkflowConfig[] = [
  {
    type: "draw",
    title: "I want to draw...",
    subtitle: "Trace over a coloring page",
    icon: <Pencil className="h-8 w-8" />,
    options: [
      {
        key: "fish",
        label: "Fish",
        icon: <Fish className="h-4 w-4" />,
        defaultPrompt:
          "a simple fish with fins and scales, easy to trace outline",
      },
      {
        key: "people",
        label: "People",
        icon: <Users className="h-4 w-4" />,
        defaultPrompt:
          "a friendly person with simple shapes, easy to trace outline",
      },
      {
        key: "buildings",
        label: "Buildings",
        icon: <Building2 className="h-4 w-4" />,
        defaultPrompt:
          "a simple house with windows and door, easy to trace outline",
      },
    ],
  },
  {
    type: "learn",
    title: "I want to learn...",
    subtitle: "Visual learning made fun",
    icon: <GraduationCap className="h-8 w-8" />,
    options: [
      {
        key: "times-tables",
        label: "Times Tables",
        icon: <Calculator className="h-4 w-4" />,
        defaultPrompt:
          "show multiplication visually with groups of objects, colorful and easy to count",
      },
      {
        key: "division",
        label: "Division",
        icon: <Divide className="h-4 w-4" />,
        defaultPrompt:
          "illustrate division by splitting objects into equal groups, clear and visual",
      },
      {
        key: "addition",
        label: "Addition",
        icon: <Plus className="h-4 w-4" />,
        defaultPrompt:
          "show addition by combining groups of objects together, bright colors",
      },
      {
        key: "reading",
        label: "Reading",
        icon: <BookOpen className="h-4 w-4" />,
        defaultPrompt:
          "create an illustrated scene that tells a simple story, storybook style",
      },
    ],
  },
  {
    type: "explore",
    title: "I want to explore...",
    subtitle: "Let your imagination run wild",
    icon: <Compass className="h-8 w-8" />,
    options: [
      {
        key: "anything",
        label: "Anything",
        icon: <Sparkles className="h-4 w-4" />,
        defaultPrompt:
          "transform my drawing into something magical and surprising",
      },
    ],
  },
];

interface WelcomeScreenProps {
  onSubmit: (workflow: WorkflowType, prompt: string) => void;
}

/**
 * Welcome screen component that guides users through workflow selection.
 * Shows on first load and dismisses after user submits a prompt.
 */
export function WelcomeScreen({ onSubmit }: WelcomeScreenProps): JSX.Element {
  const isMobile = useMobile();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(
    null
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Speech recognition refs
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

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const promptRef = useRef<string>(prompt);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
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
        setPrompt(next);
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

  const handleWorkflowSelect = useCallback(
    (workflowType: WorkflowType): void => {
      setSelectedWorkflow(workflowType);
      setSelectedOption(null);
      setPrompt("");
    },
    []
  );

  const handleOptionSelect = useCallback(
    (optionKey: string, defaultPrompt: string): void => {
      setSelectedOption(optionKey);
      setPrompt(defaultPrompt);
    },
    []
  );

  const handleSubmit = useCallback((): void => {
    if (!selectedWorkflow || !prompt.trim()) {
      return;
    }
    onSubmit(selectedWorkflow, prompt.trim());
  }, [selectedWorkflow, prompt, onSubmit]);

  const selectedWorkflowConfig = WORKFLOWS.find(
    (w) => w.type === selectedWorkflow
  );

  // Mobile compact layout
  if (isMobile) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 p-3 overflow-hidden">
        {/* Compact Header */}
        <div className="text-center mb-3 flex-shrink-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Monkey Doodle time!
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            What should we make today?
          </p>
        </div>

        {/* Workflow Buttons - Compact horizontal strips */}
        <div className="flex flex-col gap-2 mb-3 flex-shrink-0">
          {WORKFLOWS.map((workflow) => (
            <button
              key={workflow.type}
              onClick={() => handleWorkflowSelect(workflow.type)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                selectedWorkflow === workflow.type
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 shadow-md"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
              }`}
            >
              <div
                className={`p-2 rounded-full flex-shrink-0 ${
                  selectedWorkflow === workflow.type
                    ? "bg-yellow-500 text-yellow-950"
                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {workflow.icon}
              </div>
              <div className="text-left">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  {workflow.title}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {workflow.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Options & Prompt - Compact */}
        {selectedWorkflowConfig && (
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col shadow-lg">
              <CardContent className="pt-3 pb-3 flex-1 flex flex-col">
                {/* Option Chips */}
                <div className="mb-2 flex-shrink-0">
                  <Label className="text-xs font-medium mb-1 block">
                    What would you like to{" "}
                    {selectedWorkflowConfig.type === "draw"
                      ? "draw"
                      : selectedWorkflowConfig.type === "learn"
                      ? "learn"
                      : "explore"}
                    ?
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedWorkflowConfig.options.map((option) => (
                      <Button
                        key={option.key}
                        variant={
                          selectedOption === option.key ? "default" : "outline"
                        }
                        size="sm"
                        className={`gap-1 text-xs h-7 px-2 ${
                          selectedOption === option.key
                            ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                            : ""
                        }`}
                        onClick={() =>
                          handleOptionSelect(option.key, option.defaultPrompt)
                        }
                      >
                        {option.icon}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prompt Input - Compact */}
                <div className="flex-1 flex flex-col min-h-0 mb-2">
                  <Label
                    htmlFor="welcomePromptMobile"
                    className="text-xs font-medium mb-1"
                  >
                    Describe your idea
                  </Label>
                  <div className="relative flex-1">
                    <Textarea
                      id="welcomePromptMobile"
                      placeholder="Describe your idea..."
                      value={prompt}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setPrompt(e.target.value)
                      }
                      className="text-sm resize-none pr-10 h-full min-h-[60px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute right-2 top-2 h-6 w-6 p-0 hover:bg-muted ${
                        isRecording ? "text-red-600 animate-pulse" : ""
                      }`}
                      onClick={handleMicClick}
                      title={
                        isRecording ? "Stop recording" : "Start voice input"
                      }
                      aria-pressed={isRecording}
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold flex-shrink-0"
                  size="default"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Helper text when no workflow selected */}
        {!selectedWorkflow && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select an option above to get started
            </p>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <div className="w-full max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Monkey Doodle time!
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            What should we make today?
          </p>
        </div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {WORKFLOWS.map((workflow) => (
            <Card
              key={workflow.type}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                selectedWorkflow === workflow.type
                  ? "ring-2 ring-yellow-500 shadow-lg bg-yellow-50/50 dark:bg-yellow-950/20"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
              onClick={() => handleWorkflowSelect(workflow.type)}
            >
              <CardContent className="pt-6">
                {/* Placeholder Thumbnail */}
                <div className="aspect-video rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center mb-4">
                  <div
                    className={`p-4 rounded-full ${
                      selectedWorkflow === workflow.type
                        ? "bg-yellow-500 text-yellow-950"
                        : "bg-zinc-400 dark:bg-zinc-600 text-white"
                    }`}
                  >
                    {workflow.icon}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  {workflow.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {workflow.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Workflow Options & Prompt */}
        {selectedWorkflowConfig && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Option Chips */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    What would you like to{" "}
                    {selectedWorkflowConfig.type === "draw"
                      ? "draw"
                      : selectedWorkflowConfig.type === "learn"
                      ? "learn about"
                      : "explore"}
                    ?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkflowConfig.options.map((option) => (
                      <Button
                        key={option.key}
                        variant={
                          selectedOption === option.key ? "default" : "outline"
                        }
                        size="sm"
                        className={`gap-2 ${
                          selectedOption === option.key
                            ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                            : ""
                        }`}
                        onClick={() =>
                          handleOptionSelect(option.key, option.defaultPrompt)
                        }
                      >
                        {option.icon}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="welcomePrompt"
                    className="text-sm font-medium"
                  >
                    Describe what you want to create
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="welcomePrompt"
                      placeholder="Describe your idea..."
                      value={prompt}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setPrompt(e.target.value)
                      }
                      className="text-sm resize-none pr-10"
                      rows={3}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute right-2 top-2 h-6 w-6 p-0 hover:bg-muted ${
                        isRecording ? "text-red-600 animate-pulse" : ""
                      }`}
                      onClick={handleMicClick}
                      title={
                        isRecording ? "Stop recording" : "Start voice input"
                      }
                      aria-pressed={isRecording}
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-semibold"
                  size="lg"
                >
                  <Wand2 className="h-5 w-5 mr-2" />
                  Start Creating
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Helper text when no workflow selected */}
        {!selectedWorkflow && (
          <div className="text-center text-zinc-500 dark:text-zinc-400">
            <p>Select a workflow above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
