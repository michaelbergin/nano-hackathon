"use client";

import { useState, useCallback, type JSX, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  MessageSquare,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStylesCache } from "@/hooks/useStylesCache";
import type { CachedPrompt } from "@/lib/stylesCache";

interface PromptsManagerProps {
  userEmail: string;
}

const MAX_PROMPTS = 10;

/**
 * Client component for managing custom styles
 * Uses localStorage caching for fast initial load
 */
export function PromptsManager({ userEmail }: PromptsManagerProps): JSX.Element {
  const {
    prompts,
    isLoading,
    refresh: fetchPrompts,
    addPrompt,
    updatePrompt,
    removePrompt,
  } = useStylesCache();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form state
  const [formTitle, setFormTitle] = useState<string>("");
  const [formPrompt, setFormPrompt] = useState<string>("");
  const [error, setError] = useState<string>("");

  const resetForm = useCallback((): void => {
    setFormTitle("");
    setFormPrompt("");
    setError("");
    setIsCreating(false);
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, prompt: formPrompt }),
      });

      const data = await res.json();

      if (data.ok) {
        addPrompt(data.prompt); // Optimistic update with cache
        resetForm();
      } else {
        setError(data.error ?? "Failed to create prompt");
      }
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSaving(false);
    }
  }, [formTitle, formPrompt, resetForm, addPrompt]);

  const handleUpdate = useCallback(async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (editingId === null) {
      return;
    }
    setError("");
    setIsSaving(true);

    try {
      const res = await fetch(`/api/prompts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, prompt: formPrompt }),
      });

      const data = await res.json();

      if (data.ok) {
        updatePrompt(data.prompt); // Optimistic update with cache
        resetForm();
      } else {
        setError(data.error ?? "Failed to update prompt");
      }
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSaving(false);
    }
  }, [editingId, formTitle, formPrompt, resetForm, updatePrompt]);

  const handleDelete = useCallback(async (id: number): Promise<void> => {
    if (!confirm("Are you sure you want to delete this prompt?")) {
      return;
    }

    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.ok) {
        removePrompt(id); // Optimistic update with cache
      } else {
        alert(data.error ?? "Failed to delete prompt");
      }
    } catch {
      alert("Network error - please try again");
    }
  }, [removePrompt]);

  const startEdit = useCallback((prompt: CachedPrompt): void => {
    setEditingId(prompt.id);
    setFormTitle(prompt.title);
    setFormPrompt(prompt.prompt);
    setIsCreating(false);
    setError("");
  }, []);

  const startCreate = useCallback((): void => {
    setIsCreating(true);
    setEditingId(null);
    setFormTitle("");
    setFormPrompt("");
    setError("");
  }, []);

  const canCreate = prompts.length < MAX_PROMPTS;

  return (
    <div className="h-full w-full overflow-auto bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-500" />
            <h1 className="text-lg font-semibold">My Styles</h1>
          </div>
          <div className="text-sm text-muted-foreground">{userEmail}</div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="flex items-center justify-between mb-8 p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{prompts.length}</div>
              <div className="text-sm text-muted-foreground">
                of {MAX_PROMPTS} styles used
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchPrompts()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            {canCreate && !isCreating && editingId === null && (
              <Button
                onClick={startCreate}
                className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Style
              </Button>
            )}
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingId !== null) && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId !== null ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    Edit Style
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New Style
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingId !== null ? handleUpdate : handleCreate}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Watercolor Style"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      maxLength={50}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="e.g., transform into a soft watercolor painting with gentle brush strokes"
                      value={formPrompt}
                      onChange={(e) => setFormPrompt(e.target.value)}
                      className="min-h-[100px]"
                      maxLength={500}
                      required
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {formPrompt.length}/500
                    </div>
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving || !formTitle.trim() || !formPrompt.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {editingId !== null ? "Save Changes" : "Create Style"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Prompts List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
              Loading styles...
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
              <Star className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="mb-1">No custom styles yet</p>
              <p className="text-sm">
                Create styles to quickly apply your favorite transformations
              </p>
            </div>
          ) : (
            prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="p-4 rounded-xl border bg-card hover:border-muted-foreground/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <h3 className="font-medium truncate">{prompt.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {prompt.prompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(prompt)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit style"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prompt.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                      title="Delete style"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Max styles notice */}
        {!canCreate && prompts.length > 0 && (
          <div className="mt-6 p-3 rounded-lg border bg-muted/30 text-center text-sm text-muted-foreground">
            Maximum of {MAX_PROMPTS} styles reached. Delete a style to add a
            new one.
          </div>
        )}
      </main>
    </div>
  );
}

