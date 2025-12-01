# Agent Guidelines - Monkey Doodle Project

## Project Context

Monkey Doodle is a children's creative drawing application. The target audience is young children, so:

- UI must be simple and intuitive
- Interactions must be touch-friendly
- No complex workflows or confusing options

## When Working on This Codebase

### Before Making Changes

1. **Read the type definitions** in `my-site/src/types/` to understand data structures
2. **Check existing patterns** - follow established conventions
3. **Run TypeScript check** before committing: `npx tsc --noEmit`
4. **Run tests** to ensure nothing breaks: `npm test`

### Code Quality Standards

- **No `any` types** - always use proper typing
- **No `as unknown as`** - use type guards from `src/lib/typeGuards.ts`
- **Named exports** - no default exports (except Next.js pages)
- **Explicit return types** - all functions should declare return types

### Common Tasks

#### Adding a New Component

1. Create in `src/components/` with named export
2. Use types from `src/types/` if needed
3. Follow existing component patterns
4. Add to barrel export if creating a new directory

#### Adding a New Type

1. Add to appropriate file in `src/types/`
2. Export from the file
3. Import with `import type { ... }` where possible

#### Modifying Canvas Logic

1. Understand the layer system (VectorLayer, ImageLayer, BackgroundLayer)
2. State changes go through `canvasBoardReducer.ts`
3. Rendering logic is in `canvas/canvasRendering.ts`
4. Test with `CanvasBoard.reducer.test.ts`

### Files to Know

| File                            | Purpose                    |
| ------------------------------- | -------------------------- |
| `my-site/CLAUDE.md`             | Detailed coding guidelines |
| `my-site/instructions.md`       | UI/UX requirements         |
| `my-site/src/types/`            | All type definitions       |
| `my-site/src/lib/typeGuards.ts` | Runtime type safety        |
| `my-site/src/lib/errors.ts`     | Error handling             |

## Do Not

- Remove the NoZoom component or zoom prevention
- Use default exports for components
- Add `as unknown as` type casts
- Skip TypeScript checks before commits
- Modify generated shadcn/ui components in `src/components/ui/`
