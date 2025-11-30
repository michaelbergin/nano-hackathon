## Multiplayer Editing with Loro — Integration Plan

Scope: Bring real-time, multi-user collaboration to the canvas editor (layers, strokes, images, names) using Loro CRDTs with WebSocket sync and Ephemeral presence. Zero data loss under concurrency, offline-first, and compatible with existing Prisma persistence.

### Objectives

- Real-time co-editing of canvas projects (layers and strokes)
- Robust merge semantics without server-side conflict resolution
- Presence: cursors, active tool/brush, user color/name
- Local undo/redo per user
- Efficient persistence: shallow snapshots + periodic compaction
- Safe rollout with feature flags and migration from current JSON

### Key Concepts and Guardrails (Loro specifics)

- Unique PeerID per session (tab) — do not reuse across tabs/devices
- Use `LoroMovableList` for layer reordering; `LoroList` for stroke sequences
- Store coordinates in maps/objects, not raw lists for x/y (CRDT list interleaving); model stroke `points` as number[] of `[x0, y0, x1, y1, ..., xN, yN]` respecting immutable append
- Text (names/descriptions) use `LoroText` only when collaborative editing is needed; otherwise strings in `LoroMap`
- Presence via `EphemeralStore` (non-persistent, LWW)
- UTF-16 indices for text; keep emoji pitfalls in mind

### Data Model (Containers)

Root doc per project: `doc = new LoroDoc()`

Top-level structure (root containers):

- `project`: `LoroMap`
  - `name`: string (LWW)
  - `background`: `LoroMap` { `color`: string }
  - `layers`: `LoroMovableList` of layer objects

Layer object (each is a `LoroMap` in `layers`):

- `id`: string (stable UUID)
- `name`: string
- `visible`: boolean
- `type`: "vector" | "image" | "background"
- `z`: number (derived; optional)
- `data`: `LoroMap`
  - for `vector`: `{ strokes: LoroList }`
  - for `image`: `{ imageSrc: string, transform: { x: number, y: number, scale: number, rotation: number } }`

Stroke object (each element in `strokes: LoroList` is a `LoroMap`):

- `id`: string
- `color`: string
- `size`: number
- `erase`: boolean
- `points`: number[] as PolyLine2 format `[x0, y0, x1, y1, ..., x0, y0]` to ensure closure
  - Append-only for in-progress stroke; live preview via Ephemeral presence to avoid chattiness, final commit at end of pointer sequence

Presence (EphemeralStore keys — non-persistent):

- `cursor`: `{ x: number, y: number }`
- `brush`: `{ color: string, size: number, mode: "draw" | "erase" }`
- `user`: `{ id: string, name: string, color: string }`
- `selection`: `{ layerId?: string }`
- `previewStroke`: `{ layerId: string, id: string, points: number[], color: string, size: number, erase: boolean }` (optional; only while drawing)

### Transport and Sync

- Primary: WebSocket channel per project room
  - Client: `doc.subscribeLocalUpdates((bytes) => ws.send(bytes))`
  - Server: relay `Uint8Array` to room peers (no CRDT logic on server)
  - Client on message: `doc.import(new Uint8Array(data))`
- Presence: separate WebSocket channel or same socket with type-tagged frames; use `EphemeralStore.subscribeLocalUpdates`
- Fallback: HTTP long-polling or short-interval POST/GET of `export({mode:"update", from: vv})`

Message framing (same WS acceptable):

```json
{ "t": "loro", "b": <base64|binary> }
{ "t": "presence", "b": <base64|binary> }
```

Server responsibilities:

- Authenticate on upgrade (verify JWT/cookie; tie to `userId`)
- Authorize access to `projectId`
- Room fanout; backpressure and message size limits
- Optional: rate-limit joins/messages

### Persistence Strategy (Prisma)

- Store periodic `snapshot` (shallow) in `Project.loroBlob` (Uint8Array as Buffer)
- Store last `versionVector` (encoded) for incremental export on resume
- Materialize `Project.data` (JSON) for SSR/search; regenerate from `doc.toJSON()` on snapshot
- Schedule compaction:
  - Short-term: every N seconds or after M changes, call `doc.export({ mode: "shallow-snapshot", frontiers: doc.frontiers() })` and persist
  - On load: prefer latest snapshot; otherwise rebuild from `data` seed by replaying into a new doc

DB fields to add (example):

- `loroSnapshot BLOB` (nullable)
- `loroVv BLOB` (nullable)
- `data JSON` (kept for compatibility/SSR)

### Client Integration (React/Next.js)

Create a `LoroProvider` with hooks:

- `useLoroDoc(projectId)` → `{ doc, presence, status }`
  - Creates `LoroDoc`, wires WS, sets random peer ID, configures text style defaults
  - Subscribes to `doc.subscribe` and emits domain events to Canvas state
  - Loads initial state from API: `snapshot` or JSON seed

Canvas state bridge:

- Replace local reducer writes with Loro mutations for collaborative fields
- Subscribe to Loro diffs and dispatch minimal UI updates; memoize expensive re-compositions
- Keep non-collaborative UI state local (tool panels, transient UI)

Action mapping (examples):

- Add layer: `layers.push(new LoroMap({...}))`
- Reorder layer: `layers.move(from, to)` (MovableList)
- Toggle visibility: `layer.set("visible", bool)`
- Begin stroke: create `stroke` map; append points locally via presence `previewStroke`
- Commit stroke: push final stroke to `strokes` list and commit

Undo/Redo:

- Use `new UndoManager(doc, { mergeInterval: 300, excludeOriginPrefixes: ["sync-"] })`
- Bind UI buttons to `undo.undo()` / `undo.redo()`
- Save/restore brush cursor via `onPush`/`onPop`

### Migration Plan

1. Read existing `Project.data` JSON; construct Loro containers accordingly
2. Ensure `points` arrays meet PolyLine2 closure; if not, append first point to end
3. Initialize `layers` order to match current rendering (bottom→top)
4. Persist first snapshot + vv; keep `data` as materialized value
5. Roll out read-only viewer using Loro to validate parity; then enable edits feature-flagged

### Rollout Phases

1. Phase 0: Local-only Loro doc (no WS), parity with current reducer
2. Phase 1: WS sync for doc changes; no presence
3. Phase 2: Presence (cursor, brush, selection, previewStroke)
4. Phase 3: Undo/redo, commit metadata, change messages
5. Phase 4: Persistence (snapshots + compaction); cold start restore
6. Phase 5: Performance tuning and instrumentation

### Performance & Tuning

- Batch edits with `doc.setChangeMergeInterval(100)`
- Use `subscribeLocalUpdates` streaming; avoid sending per-pointer-move ops—use presence for previews
- Re-render throttle: keep 30fps scheduler; recompose only changed layers
- Periodic shallow snapshots to bound import time for new joiners

### Security & Abuse Prevention

- Auth check on WS connect; project membership via DB
- Enforce project room scoping; no cross-project broadcast
- Limit message size and rate; disconnect abusive clients
- Server logging of join/leave and snapshot writes

### Failure Modes & Recovery

- WS drop: buffer local ops; resend on reconnect via `export({ mode: "update", from: lastVv })`
- Corrupt or incompatible snapshot: fall back to last good snapshot or JSON materialization
- Presence TTL expiration clears stale cursors automatically (default 30s)

### Testing Matrix

- Concurrent reorder + visibility toggles on layers
- Simultaneous drawing on same vector layer (append-only stroke commits)
- Undo/redo under remote edits interleaving
- Join mid-session: import time and parity
- Mobile Safari pointer stream + presence updates

### Minimal API/Files to Add (high-level)

- `src/app/api/realtime/route.ts` (WS upgrade + room relay)
- `src/lib/realtime.ts` (client socket factory)
- `src/lib/loro.ts` (LoroProvider, hooks, presence helpers, type guards)
- `src/server/snapshots.ts` (persist/restore snapshot + vv)

### TypeScript Notes

- Explicit return types and type-only imports
- No implicit `any`; prefer interfaces for domain entities
- Avoid `as const` in type declarations
- Validate arrays (points length multiple of 2; PolyLine2 closure)
- Avoid mutating geometry arrays; create new instances

### Acceptance Criteria

- Two browsers can co-edit the same project; strokes and layers converge
- Presence renders remote cursors/brush previews within 100ms p50
- Refresh/reconnect restores to latest state within 1s on typical projects
- Undo/redo affects only local user’s recent changes
- Snapshots reduce new-join import to <200ms on medium projects

### Open Questions / Future Work

- Optional CRDT text labels on layers via `LoroText`
- Media assets locking (per-image move handles) via presence claims
- Branching (fork/merge) for lessons/reviews using `fork()`/`import()`








