# Banananano - Shadcn/UI Implementation

## Overview

Successfully implemented shadcn/ui components throughout the Banananano application, replacing all custom UI elements with best-in-class, accessible components.

## What Was Implemented

### Core Dependencies

- ✅ **shadcn/ui** - Complete component library setup
- ✅ **lucide-react** - Icon library for consistent iconography
- ✅ **class-variance-authority** - Component variant management
- ✅ **clsx & tailwind-merge** - Utility functions for styling

### Shadcn Components Added

- **Button** - All interactive elements now use consistent button variants
- **Input** - Form inputs with proper styling and accessibility
- **Card** - Container components for content organization
- **Sheet** - Slide-out navigation panel (replaces custom sidebar)
- **Label** - Accessible form labels
- **Form** - Form management (ready for future expansion)
- **Badge** - Status indicators and metadata display

### Updated Components

#### 1. AppShell (`src/components/AppShell.tsx`)

- **Before**: Custom sidebar with manual positioning and click-outside logic
- **After**: Clean Sheet component with proper accessibility
- **Improvements**:
  - Proper ARIA attributes
  - Keyboard navigation support
  - Consistent spacing and typography
  - Icon integration with lucide-react

#### 2. LoginForm (`src/app/account/login/LoginForm.tsx`)

- **Before**: Basic HTML inputs and buttons
- **After**: Professional card-based form with shadcn components
- **Improvements**:
  - Password visibility toggle
  - Loading states with spinner
  - Error state styling
  - Proper form validation feedback
  - Card layout for better visual hierarchy

#### 3. Main Page (`src/app/page.tsx`)

- **Before**: Simple form and list layout
- **After**: Card-based layout with proper typography
- **Improvements**:
  - Card components for content sections
  - Icon integration
  - Better visual hierarchy
  - Consistent spacing and colors

#### 4. Project Page (`src/app/projects/[id]/page.tsx`)

- **Before**: Basic layout with minimal styling
- **After**: Professional card-based layout
- **Improvements**:
  - Card containers for header and content
  - Badge component for metadata
  - Icon integration
  - Better visual separation

## Design Principles Applied

### 1. Minimal and Elegant

- Clean component interfaces
- Consistent spacing using Tailwind's design tokens
- Proper visual hierarchy
- Subtle shadows and borders

### 2. Best Practices for Developer Experience

- **TypeScript**: Full type safety with proper JSX.Element types
- **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
- **Performance**: Proper React patterns, memoization-ready components
- **Maintainability**: Modular component structure, consistent naming

### 3. Consistent Theming

- Uses shadcn's design system with CSS custom properties
- Dark/light mode ready (CSS variables in place)
- Consistent color palette and typography
- Proper contrast ratios for accessibility

## Technical Implementation Details

### Configuration

- **shadcn config**: `components.json` with New York style
- **Tailwind**: Integrated with shadcn's CSS variables
- **Icons**: Lucide React with consistent sizing and styling

### Component Architecture

- **Composition**: Components use React composition patterns
- **Variants**: Button and other components support multiple variants
- **Accessibility**: All components include proper ARIA attributes
- **TypeScript**: Strict typing throughout

### File Structure

```
src/components/ui/          # shadcn components
├── button.tsx
├── input.tsx
├── card.tsx
├── sheet.tsx
├── label.tsx
├── form.tsx
└── badge.tsx
```

## Benefits Achieved

1. **Consistency**: All UI elements now follow the same design language
2. **Accessibility**: Proper ARIA support and keyboard navigation
3. **Maintainability**: Modular components that are easy to update
4. **Developer Experience**: Type-safe, well-documented components
5. **Performance**: Optimized React components with proper patterns
6. **Future-Proof**: Easy to extend and customize components

## Next Steps (Optional)

- Add more shadcn components as needed (Dialog, Toast, etc.)
- Implement dark mode toggle
- Add more interactive components (Dropdown, Select, etc.)
- Create custom component variants for brand-specific styling

## Development Commands

```bash
# Install dependencies
yarn

# Start development server
yarn dev

# Type checking
yarn typecheck

# Linting
yarn lint
```

All components are now production-ready with best-in-class UX and developer experience.

## Canvas Layers and Screenshot

### Layered Drawing System

- Layers: Each canvas now contains an ordered list of layers `{ id, name, visible, strokes[] }`.
- Active layer: Only the active layer receives draw/erase interactions; hidden layers are not drawn nor captured in screenshots.
- Strokes: Each stroke is a polyline with `{ points: number[], color: string, size: number, erase: boolean }`.
- State management: A reducer manages actions for adding/removing/selecting layers, toggling visibility, renaming, clearing, and adding strokes to the active layer.

#### Performance Optimizations — NEW

- 30fps scheduler: Canvas redraws are gated by a requestAnimationFrame scheduler targeting 30fps to reduce jank under load.
- Event throttling: Pointer move and resize paths no longer trigger immediate redraw; they request a scheduled frame.
- Image caching: Images are preloaded and cached; redraw is requested onload only.
- Stroke thinning: During pointer move, closely spaced points (< 1px) are dropped to minimize path density without visible loss.
- Non-mutating UI transforms: Layer list uses `[...layers].reverse()` to avoid mutating state during render.
- Reorder layers: DnD reorders top→bottom in UI, mapped to bottom→top for reducer/renderer.

#### Drag-and-Drop Layer Reordering — NEW

- UI: Layers card supports drag-and-drop reordering using dnd-kit.
- Order semantics: The UI shows the top-most layer at the top of the list. Dragging changes the visual order to match canvas rendering.
- Rendering: Canvas draws from bottom to top; the reducer stores layers in bottom→top order internally.
- New action: `REORDER_LAYERS` updates the reducer with the new order while preserving unknown ids safely.
- Adding layers: New vector/image layers are added to the top of the stack and appear at the top of the list.

### Persistence

- Serialization: Canvas data is saved as `{ layers: Layer[] }` to `Project.data`.
- Legacy support: If legacy JSON is an array of strokes, it is loaded as a single visible layer named "Layer 1".

### Screenshot (Composite) & Download

- Function: `getCanvasScreenshot(layers, width, height)` composes visible layers into a single PNG data URL, honoring transparency and brush/erase operations.
- UI: A "Screenshot" button stores the latest composite image in memory and previews it beneath the layer controls. A "Download PNG" button saves the latest composite to disk as `canvas-YYYYMMDD-hhmmss.png`.

#### Device Pixel Ratio (DPR) Fix — NEW

- **Issue**: Screenshots were capturing double the canvas region on iPad/mobile devices due to automatic DPR scaling.
- **Root Cause**: The `getCanvasScreenshotAsync` function was receiving CSS pixel dimensions but internally scaling by device pixel ratio (DPR=2 on retina displays), resulting in 2x larger output images.
- **Solution**: Added explicit `dprInput: 1` parameter to all screenshot functions to force consistent 1:1 pixel ratio across all devices:
  - `captureScreenshot()` - For composite preview
  - `downloadComposite()` - For PNG download
  - `onGenerateBanana()` - For AI generation input
- **Result**: Screenshots now capture the exact canvas region consistently across desktop, tablet, and mobile devices.

### Image Uploads & Cloudinary

- Upload: An "Upload Image" button lets you pick an image file; it becomes a top image layer with an `img` badge. Image layers persist in project data like vector layers.
- Aspect Ratio Preservation: Uploaded images automatically preserve their original aspect ratio while fitting within the canvas bounds. Images are centered and scaled to fit the available space without distortion.
- Cloudinary: Client-side unsigned uploads are supported.
  - Cloud name: `dqyx4lyxn`
  - Configure env var `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` with your unsigned preset name
  - If not configured, a local object URL is used as a fallback for immediate display (not uploaded).

Signed uploads (fallback when no unsigned preset):

- Server route: `POST /api/cloudinary/sign` returns a signature for upload params.
- The client calls this route and posts to Cloudinary with `api_key`, `timestamp`, and `signature`.
- Requires `.env.local` with `CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@dqyx4lyxn`.

### Nano-Banana Generate

- Generate button: Posts the current composite to `/api/nano-banana` with a prompt.
- Prompt input: A shadcn `Input` labeled "Prompt" allows changing the text sent to generation. Default placeholder is `banana-fy` and initial value is `banana-fy`.
- Result: The returned image URL is added as a topmost image layer with a yellow "banana" badge. Image layers are persisted in the same `layers` array with `{ type: "image", imageSrc, banana }`.

### Canvas Controls Extraction (CanvasBoardControls) ✅ COMPLETED

**Goal**: Move all canvas overlay controls and user-triggered actions out of `src/components/CanvasBoard.tsx` into `src/components/CanvasBoardControls.tsx`, keeping DOM/drawing/persistence in `CanvasBoard`.

**Status**: ✅ Complete - All UI controls have been successfully extracted to CanvasBoardControls.tsx

**Changes Made**:

- ✅ Created complete CanvasBoardControls.tsx with all features from CanvasBoard.tsx
- ✅ Added all missing actions: download, upload, banana prompt, layer management
- ✅ Implemented left-aligned single column layout matching original design
- ✅ Added proper TypeScript types for state and actions
- ✅ Included banana badge display and all layer functionality
- ✅ Removed entire legacy left-hand menu from CanvasBoard.tsx
- ✅ Cleaned up unused imports and callback functions
- ✅ Fixed all linting errors

**API**:

- Props: `{ state, actions }`
- `state`: `{ mode, strokeColor, brushSize, layers, activeLayerId, compositeDataUrl, isGenerating }`
- `actions`: `{ addLayer, removeLayer, selectLayer, toggleLayerVisibility, setMode, setColor, setBrushSize, clearActive, clearAll, captureComposite, generateBanana }`

Boundaries:

- Controls are DOM-agnostic (no refs, no canvas ops).
- `CanvasBoard` retains reducer, pointer handlers, draw/resize, persistence.

Steps:

1. Created `CanvasBoardControls.tsx` with typed props and shadcn/ui minimal UI.
2. Integrated into `CanvasBoard.tsx` and passed memoized action callbacks.
3. Removed inline overlay controls from `CanvasBoard.tsx`.
4. Preserved brush clamping and `resizeCanvas()` in board callbacks.

Acceptance:

- Feature parity: draw/erase, color/size, layers (add/remove/select/visibility), clear active/all, screenshot preview, banana generate, persistence.
- No new type/ESLint errors; no perf regressions.

### Controls Layout Update (Left/Right Columns)

- Left column (top-left overlay): `Tools`, `Actions` (Clear Active, Clear All, Screenshot), and conditional `Preview`.
- Right column (center-right overlay): `Layers` list and a dedicated `Generate` card with the Generate button.
- Rationale: keeps drawing affordances on the left while moving workflow/layer management to the right, minimizing hand travel and creating a balanced canvas workspace.
- Implementation: `CanvasBoardControls.tsx` renders two absolutely positioned stacks:
  - Left: `left-4 top-4 flex-col gap-4`
  - Right: `right-4 top-1/2 -translate-y-1/2 flex-col gap-4`
  - Generate button moved out of Actions and into a new right-side "Generate" card.

## Creation Flow & Header Updates

### Quick Create (Untitled)

- A quick-create icon is now in the header next to the `Banananano` brand.
- Clicking it navigates to `/new`, which performs the project creation and redirects to `/create?id=<projectId>`.
- File: `src/components/Header.tsx` routes to `/new` for consistent behavior with the left menu.

### Centered Project Name in Header

- When a project is loaded, its name appears centered in the header.
- Files: `src/components/Header.tsx` (absolute center overlay), consumed via `AppShell` props from project pages.

#### Inline Rename (Click-to-Edit) — NEW

- Click the centered project title in the header to rename it inline.
- Editing UX:
  - Enter submits, Escape cancels, Blur submits.
  - Optimistic update with a background `PATCH /api/projects/[id]` of `{ name }`.
  - On success, the header refreshes via `router.refresh()` to stay in sync.
  - Disabled while saving; reverts on error.
- Implementation details in `src/components/Header.tsx`:
  - Local state: `isEditingName`, `pendingName`, `isSavingName` with input `ref` for focus/select.
  - Keeps `pendingName` synchronized with incoming `projectName` prop changes.
  - Only enabled when `projectId` is present.

### Create Page Uses Project Context

- `/create` now requires a `?id=<projectId>` query param, validates auth, loads the project, and renders `ProjectCanvas` with persistence.
- File: `src/app/create/page.tsx`.
- Behavior mirrors `projects/[id]` page: saves canvas to `PATCH /api/projects/[id]`.

### New Project Route Behavior

- `/new` auto-creates an `untitled` project on mount and redirects to `/create?id=<projectId>`.
- File: `src/app/new/page.tsx`.

### Navigation Summary

- Links: `New Project` (`/new`), `Create` (`/create?id=...`), `Projects` (`/projects`).
- Header brand area includes a quick-create icon for fast entry to a new canvas.

## Code Refactoring - Canvas Utils Extraction ✅ COMPLETED

### Goal

Extract the largest utility functions from `CanvasBoard.tsx` to improve code organization and maintainability by creating a separate `canvasUtils.ts` file.

### What Was Extracted

Successfully moved the following functions to `src/components/canvasUtils.ts`:

1. **`boardReducer`** (~210 lines) - The main state reducer for canvas operations
2. **`getCanvasScreenshotAsync`** (~40 lines) - Async screenshot generation with image layer support
3. **`getCanvasScreenshot`** (~35 lines) - Sync screenshot generation for vector layers only
4. **`drawPathOnContext`** (~20 lines) - Pure utility for drawing paths on canvas context
5. **`generateLayerId`**, **`createLayer`**, **`ensureActiveLayerId`** - Small utility functions

### Benefits Achieved

- **Reduced CanvasBoard.tsx size**: Removed ~300+ lines of utility code
- **Better separation of concerns**: Pure functions separated from React component logic
- **Improved maintainability**: Utility functions now have dedicated, testable module
- **Enhanced reusability**: Canvas utilities can be imported by other components if needed

### Technical Details

- All extracted functions are pure utilities with minimal dependencies
- Proper TypeScript types maintained throughout the extraction
- Updated test file (`CanvasBoard.reducer.test.ts`) to import from new location
- Zero breaking changes - all functionality preserved
- TypeScript compilation passes successfully

### File Structure

```
src/components/
├── CanvasBoard.tsx        # React component with DOM/UI logic
├── canvasUtils.ts         # Pure utility functions
├── CanvasBoardControls.tsx
└── CanvasBoard.reducer.test.ts  # Updated to use canvasUtils
```

This refactoring maintains full backward compatibility while significantly improving code organization and making the codebase more maintainable.
