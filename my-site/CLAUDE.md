# Claude Code Guidelines - Monkey Doodle Application

## Quick Reference

```bash
npm run dev      # Start development server
npm run build    # Production build
npm test         # Run tests (vitest)
npx tsc --noEmit # Type check without emitting
```

## Architecture Overview

### Type System (`src/types/`)

All types are centralized for consistency and reusability:

| File          | Purpose                                               |
| ------------- | ----------------------------------------------------- |
| `canvas.ts`   | Layer, PathStroke, BoardState, BoardAction, BoardMode |
| `workflow.ts` | WorkflowType, WorkflowConfig, WelcomeScreenProps      |
| `api.ts`      | NanoBananaRequest, NanoBananaResponse, API types      |

**Pattern**: Components re-export types for backward compatibility:

```typescript
// In component file
export type { Layer, PathStroke } from "@/types/canvas";
```

### Canvas System (`src/components/`)

The canvas drawing system uses a layered architecture:

```
CanvasBoard.tsx          # Main component, state management
├── canvasBoardReducer.ts  # State reducer with undo/redo
├── canvasUtils.ts         # Layer creation, drawing utilities
└── canvas/                # Extracted modules
    ├── canvasRendering.ts   # Pure rendering functions
    ├── useCanvasRenderer.ts # Canvas setup hook
    └── useCanvasPointers.ts # Pointer event handling
```

**Layer Types** (discriminated union):

- `VectorLayer` - Strokes/drawings
- `ImageLayer` - Uploaded or generated images
- `BackgroundLayer` - Canvas background color

### Type Guards (`src/lib/typeGuards.ts`)

Always use type guards instead of unsafe casts:

```typescript
// ❌ Bad
const events = (
  evt as unknown as { getCoalescedEvents(): PointerEvent[] }
).getCoalescedEvents();

// ✅ Good
const events = getCoalescedEventsSafe(evt);
```

Available guards:

- `isLayer()`, `isVectorLayer()`, `isImageLayer()`
- `hasCoalescedEvents()`, `getCoalescedEventsSafe()`
- `getSpeechRecognitionCtor()` - Browser speech API
- `isCloudinaryResponse()` - API response validation

### Error Handling (`src/lib/errors.ts`)

```typescript
import { getErrorMessage, logError, assert } from "@/lib/errors";

try {
  // risky operation
} catch (err) {
  logError("Operation failed", err);
  return { error: getErrorMessage(err) };
}

// Invariant assertions
assert(value > 0, "Value must be positive");
assertDefined(user, "User must exist");
```

## Component Guidelines

### Named Exports Only

```typescript
// ❌ Bad
export default function MyComponent() {}

// ✅ Good
export function MyComponent() {}
```

Exception: Next.js pages require default exports.

### Hook Files

- Hooks that don't return JSX use `.ts` extension
- Hooks that render JSX use `.tsx` extension
- Example: `useMobile.ts` (returns boolean, no JSX)

### Import Organization

```typescript
// 1. React/Next imports
import type { JSX } from "react";
import { useState, useCallback } from "react";

// 2. External libraries
import { Button } from "@/components/ui/button";

// 3. Internal types
import type { Layer, BoardState } from "@/types/canvas";

// 4. Internal modules
import { boardReducer } from "./canvasBoardReducer";
```

## Testing

Tests use Vitest. Test files are co-located:

```
CanvasBoard.tsx
CanvasBoard.reducer.test.ts
```

Run tests: `npm test`

## Critical Requirements

### No-Zoom Policy

This is a full-frame application. ALL zoom must be disabled:

- Viewport: `maximumScale: 1`, `userScalable: false`
- NoZoom component blocks gestures/keyboard shortcuts
- All inputs must be 16px minimum (prevents iOS auto-zoom)

See `instructions.md` for complete zoom prevention details.

### Canvas Rendering

- Target 30 FPS with frame limiting
- Use offscreen canvas for layer compositing
- Always force render after state changes that affect visuals

## File Naming Conventions

| Type       | Convention     | Example                       |
| ---------- | -------------- | ----------------------------- |
| Components | PascalCase.tsx | `CanvasBoard.tsx`             |
| Hooks      | camelCase.ts   | `useMobile.ts`                |
| Utils      | camelCase.ts   | `canvasUtils.ts`              |
| Types      | camelCase.ts   | `canvas.ts`                   |
| Tests      | \*.test.ts     | `CanvasBoard.reducer.test.ts` |
