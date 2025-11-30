/**
 * Styles (custom prompts) caching utility with localStorage persistence
 * Provides instant loading from cache with background refresh
 */

export interface CachedPrompt {
  id: number;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

interface CacheData {
  prompts: CachedPrompt[];
  timestamp: number;
  version: number;
}

const CACHE_KEY = "cachedStyles";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - return cached data immediately
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours - discard cache entirely

/**
 * Get cached styles from localStorage
 * Returns null if cache is missing, expired, or invalid
 */
export function getCachedStyles(): CachedPrompt[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const data: CacheData = JSON.parse(raw);

    // Version mismatch - discard
    if (data.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Cache too old - discard
    const age = Date.now() - data.timestamp;
    if (age > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.prompts;
  } catch {
    // Invalid JSON or other error - clear cache
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Check if cache is fresh (within TTL)
 * Fresh cache can be used without background refresh
 */
export function isCacheFresh(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return false;
    }

    const data: CacheData = JSON.parse(raw);
    const age = Date.now() - data.timestamp;
    return age < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Save styles to localStorage cache
 */
export function setCachedStyles(prompts: CachedPrompt[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const data: CacheData = {
      prompts,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * Invalidate the cache (call after create/update/delete)
 */
export function invalidateStylesCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Update cache optimistically after create
 */
export function addToStylesCache(prompt: CachedPrompt): void {
  const cached = getCachedStyles();
  if (cached) {
    setCachedStyles([prompt, ...cached]);
  }
}

/**
 * Update cache optimistically after update
 */
export function updateInStylesCache(prompt: CachedPrompt): void {
  const cached = getCachedStyles();
  if (cached) {
    setCachedStyles(
      cached.map((p) => (p.id === prompt.id ? prompt : p))
    );
  }
}

/**
 * Update cache optimistically after delete
 */
export function removeFromStylesCache(id: number): void {
  const cached = getCachedStyles();
  if (cached) {
    setCachedStyles(cached.filter((p) => p.id !== id));
  }
}
