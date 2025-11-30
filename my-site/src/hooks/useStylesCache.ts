"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCachedStyles,
  setCachedStyles,
  isCacheFresh,
  invalidateStylesCache,
  addToStylesCache,
  updateInStylesCache,
  removeFromStylesCache,
  type CachedPrompt,
} from "@/lib/stylesCache";

interface UseStylesCacheReturn {
  prompts: CachedPrompt[];
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  invalidate: () => void;
  // Optimistic update helpers
  addPrompt: (prompt: CachedPrompt) => void;
  updatePrompt: (prompt: CachedPrompt) => void;
  removePrompt: (id: number) => void;
}

/**
 * Hook for managing styles with localStorage caching
 * Returns cached data immediately, refreshes in background if stale
 */
export function useStylesCache(): UseStylesCacheReturn {
  const [prompts, setPrompts] = useState<CachedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const isMounted = useRef(true);

  const fetchFromApi = useCallback(async (): Promise<CachedPrompt[]> => {
    const res = await fetch("/api/prompts");
    const data = await res.json();

    if (data.ok && Array.isArray(data.prompts)) {
      return data.prompts;
    }

    if (!data.ok && data.error === "Not authenticated") {
      // User not logged in - return empty
      return [];
    }

    throw new Error(data.error ?? "Failed to load styles");
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const freshPrompts = await fetchFromApi();
      if (isMounted.current) {
        setPrompts(freshPrompts);
        setCachedStyles(freshPrompts);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to load styles");
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFromApi]);

  const invalidate = useCallback((): void => {
    invalidateStylesCache();
  }, []);

  // Optimistic update: add
  const addPrompt = useCallback((prompt: CachedPrompt): void => {
    setPrompts((prev) => [prompt, ...prev]);
    addToStylesCache(prompt);
  }, []);

  // Optimistic update: update
  const updatePrompt = useCallback((prompt: CachedPrompt): void => {
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? prompt : p)));
    updateInStylesCache(prompt);
  }, []);

  // Optimistic update: remove
  const removePrompt = useCallback((id: number): void => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    removeFromStylesCache(id);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Try to get cached data first
    const cached = getCachedStyles();
    const fresh = isCacheFresh();

    if (cached) {
      // Return cached data immediately
      setPrompts(cached);

      if (fresh) {
        // Cache is fresh - no need to fetch
        setIsLoading(false);
      } else {
        // Cache is stale - refresh in background
        setIsLoading(false); // Don't show loading for background refresh
        void refresh();
      }
    } else {
      // No cache - fetch fresh
      void refresh();
    }

    return () => {
      isMounted.current = false;
    };
  }, [refresh]);

  return {
    prompts,
    isLoading,
    error,
    refresh,
    invalidate,
    addPrompt,
    updatePrompt,
    removePrompt,
  };
}
