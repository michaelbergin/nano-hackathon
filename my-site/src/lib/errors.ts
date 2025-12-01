/**
 * Error handling utilities
 * Provides consistent error handling patterns across the codebase
 */

/**
 * Extract a human-readable message from an unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Log an error with context information
 */
export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, message, error);
}

/**
 * Log a warning with context information
 */
export function logWarning(context: string, message: string): void {
  console.warn(`[${context}]`, message);
}

/**
 * Create a standardized error for API responses
 */
export function createApiError(
  message: string,
  statusCode: number = 500
): { error: string; statusCode: number } {
  return { error: message, statusCode };
}

/**
 * Wrap an async function with error logging
 */
export async function withErrorLogging<T>(
  context: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logError(context, error);
    return null;
  }
}

/**
 * Assert a condition and throw if false
 */
export function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}
