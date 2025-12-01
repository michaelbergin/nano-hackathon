# Agent Guidelines - Monkey Doodle Application

## Quick Start

```bash
cd my-site
npm install
npm run dev     # http://localhost:3000
```

## Architecture at a Glance

```
src/
├── app/           # Next.js App Router (pages, API routes)
├── components/    # React components
│   ├── canvas/    # Canvas rendering utilities
│   └── ui/        # shadcn/ui (DO NOT MODIFY)
├── hooks/         # Custom React hooks
├── lib/           # Utilities
│   ├── typeGuards.ts  # Use these instead of type casts
│   └── errors.ts      # Error handling helpers
├── types/         # TypeScript definitions (centralized)
└── stack/         # Authentication (Stack Auth)
```

## Type System

### Where Types Live

| Domain   | File                | Key Types                                  |
| -------- | ------------------- | ------------------------------------------ |
| Canvas   | `types/canvas.ts`   | Layer, PathStroke, BoardState, BoardAction |
| Workflow | `types/workflow.ts` | WorkflowType, WorkflowConfig               |
| API      | `types/api.ts`      | Request/Response types                     |

### Type Safety Rules

```typescript
// ✅ Use type guards
import { isVectorLayer, getCoalescedEventsSafe } from "@/lib/typeGuards";

if (isVectorLayer(layer)) {
  // layer is typed as VectorLayer here
}

// ❌ Never do this
const x = something as unknown as SomeType;
```

## Canvas System

### State Management

```
User Action → boardReducer → New State → requestRender() → drawAll()
```

### Layer Types (Discriminated Union)

```typescript
type Layer = VectorLayer | ImageLayer | BackgroundLayer;

// Check type with:
if (layer.type === "vector") {
  /* VectorLayer */
}
if (layer.type === "image") {
  /* ImageLayer */
}
if (layer.type === "background") {
  /* BackgroundLayer */
}
```

### Adding Canvas Features

1. Define action in `types/canvas.ts` (BoardAction union)
2. Handle in `canvasBoardReducer.ts`
3. Add to `isUndoable()` if it should support undo
4. Test with `CanvasBoard.reducer.test.ts`

## Component Patterns

### Creating Components

```typescript
// src/components/MyComponent.tsx
import type { JSX } from "react";

interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

export function MyComponent({
  value,
  onChange,
}: MyComponentProps): JSX.Element {
  return <div>{value}</div>;
}
```

### Using Hooks

```typescript
// Hooks that return data/functions only: .ts
export function useMobile(): boolean { ... }

// Hooks that return JSX: .tsx
export function useDialog(): JSX.Element { ... }
```

## API Routes

Located in `src/app/api/`. Pattern:

```typescript
// src/app/api/example/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    // ... handle request
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

Tests are co-located with source files:

- `CanvasBoard.tsx` → `CanvasBoard.reducer.test.ts`

## Common Gotchas

### 1. Zoom Prevention

The app blocks all zoom. If adding inputs, ensure font-size ≥ 16px to prevent iOS auto-zoom on focus.

### 2. Canvas Rendering

After state changes, call `requestRender()` for throttled updates or `forceRender()` for immediate updates.

### 3. Image Loading

Images must be loaded into cache before rendering:

```typescript
ensureImageLoaded(layer.imageSrc);
```

### 4. Layer Offsets

Vector layers can have `offsetX`/`offsetY`. Account for this when:

- Converting pointer coordinates to stroke points
- Calculating bounding boxes

## Checklist Before Committing

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] No `as unknown as` casts added
- [ ] No default exports added (except pages)
- [ ] Types imported with `import type` where possible
