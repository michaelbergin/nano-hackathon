# Claude Code Guidelines - Monkey Doodle Project

## Project Overview

Monkey Doodle is a children's creative drawing application with AI-powered image generation. The project uses Next.js 14+, TypeScript, Prisma, and shadcn/ui.

## Repository Structure

```
nano-hackathon/
├── my-site/           # Main Next.js application
├── instructions.md    # General project instructions
└── CLAUDE.md         # This file - architectural guidelines
```

## Core Architectural Principles

### 1. TypeScript Best Practices

- **Centralized Types**: All types live in `src/types/` directory
  - `canvas.ts` - Canvas/drawing types
  - `workflow.ts` - Workflow/UI types
  - `api.ts` - API request/response types
- **Discriminated Unions**: Use for polymorphic types (e.g., Layer types)
- **Type Guards**: Prefer runtime type guards over `as unknown as` casts
- **No Implicit Any**: All parameters must be explicitly typed

### 2. Component Architecture

- **Named Exports Only**: No default exports for components (Next.js pages excluded)
- **Single Responsibility**: Each component does one thing well
- **Hooks for Logic**: Extract complex logic into custom hooks
- **Pure Functions**: Extract rendering utilities into separate modules

### 3. File Organization

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── canvas/       # Canvas-specific utilities and hooks
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
│   ├── typeGuards.ts # Runtime type guards
│   └── errors.ts     # Error handling utilities
└── types/            # TypeScript type definitions
```

### 4. Error Handling

- Use `getErrorMessage()` for safe error extraction
- Use `logError()` / `logWarning()` for consistent logging
- Use `assert()` / `assertDefined()` for invariants

### 5. Code Style

- Explicit return types on functions
- No unused variables or imports
- Prefer `const` over `let`
- Use template literals for string interpolation

## Key Files Reference

- `my-site/CLAUDE.md` - Detailed application-specific guidelines
- `my-site/instructions.md` - UI/UX requirements and component documentation
