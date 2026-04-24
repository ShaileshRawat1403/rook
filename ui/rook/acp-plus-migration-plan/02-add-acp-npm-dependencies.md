# Step 02: Add ACP NPM Dependencies to rook2

## Objective

Add `@aaif/rook-acp` and `@agentclientprotocol/sdk` as dependencies of the rook2 frontend so we can use the TypeScript ACP client.

## Why

The `@aaif/rook-acp` package (located at `ui/acp/` in the monorepo) already provides:

- **`RookClient`** — a full TypeScript ACP client wrapping `ClientSideConnection`
- **`RookExtClient`** — generated typed client for Rook extension methods (`rook/providers/list`, `rook/session/export`, etc.)
- **`createHttpStream`** — an HTTP+SSE transport (we won't use this — we'll use WebSocket instead, see Step 03)
- **Generated types + Zod validators** for all Rook ACP extension method request/response shapes

This package is already used by `ui/desktop` (Electron) and `ui/text` (Ink TUI). rook2 currently does NOT depend on it.

## Changes

### 1. Add dependencies

**File:** `ui/rook2/package.json`

rook2 has its own `pnpm-lock.yaml` and is not part of the `ui/pnpm-workspace.yaml` workspace. Use the published npm packages:

```bash
cd ui/rook2
pnpm add @aaif/rook-acp @agentclientprotocol/sdk@^0.14.1
```

The `@aaif/rook-acp` package declares `@agentclientprotocol/sdk` as a peer dependency (`"*"`). Pin to `^0.14.1` to match the version used by `ui/acp/package.json`.

### 2. Verify the dependency resolves

After installation, verify the imports work:

```bash
cd ui/rook2
pnpm typecheck
```

Create a temporary test file to confirm imports resolve:

```typescript
// src/shared/api/_test_acp_import.ts (DELETE AFTER VERIFICATION)
import { RookClient } from "@aaif/rook-acp";
import type { Client, SessionNotification } from "@agentclientprotocol/sdk";

console.log("RookClient:", RookClient);
```

Run `pnpm typecheck` to confirm no type errors. Then delete the test file.

### 3. Verify key exports are available

The following imports must resolve — these are what Steps 03–06 will use:

From `@aaif/rook-acp`:
```typescript
import { RookClient } from "@aaif/rook-acp";
```

From `@agentclientprotocol/sdk`:
```typescript
import type {
  Client,
  SessionNotification,
  SessionUpdate,
  ContentBlock,
  ToolCallContent,
  RequestPermissionRequest,
  RequestPermissionResponse,
  NewSessionRequest,
  NewSessionResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  SetSessionConfigOptionRequest,
  SetSessionConfigOptionResponse,
  ForkSessionRequest,
  ForkSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  InitializeRequest,
  ProtocolVersion,
  Implementation,
  SessionModelState,
  SessionInfoUpdate,
  SessionConfigOption,
  SessionConfigKind,
  SessionConfigSelectOptions,
  SessionConfigOptionCategory,
} from "@agentclientprotocol/sdk";
```

## Verification

1. `pnpm typecheck` passes with no errors related to the new dependencies.
2. `pnpm check` (Biome lint + file sizes) passes.
3. `pnpm test` still passes (no existing tests should break).

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `@aaif/rook-acp` and `@agentclientprotocol/sdk` to dependencies |
| `pnpm-lock.yaml` | Auto-updated by pnpm |

## Notes

- `RookClient` wraps `ClientSideConnection` from `@agentclientprotocol/sdk` and adds Rook-specific extension methods via `RookExtClient`.
- The package ships `createHttpStream` (HTTP+SSE transport), but we will use **WebSocket** transport instead. `RookClient` accepts any `Stream` (a `{ readable, writable }` pair of `ReadableStream<AnyMessage>` and `WritableStream<AnyMessage>`). In Step 03 we'll create a `createWebSocketStream` helper.
- The `rook serve` WebSocket endpoint at `/acp` uses simple framing: each WS text frame is a single JSON-RPC message (no newline delimiters needed). This is the same transport the Rust Tauri backend already uses in `thread.rs`.
