# Development

## Activate toolchain

Always do this first when entering the repo. Hermit pins all the tools.

```bash
source bin/activate-hermit
```

## Build the CLI

```bash
cargo build -p rook-cli
```

The binary lands at `target/debug/rook`.

## Run the CLI

```bash
cargo run -p rook-cli -- --help
# or, after building:
./target/debug/rook --help
```

Bare `./target/debug/rook` (no args) opens the TUI.

## Run the desktop app

```bash
cd ui/rook
pnpm install     # one-time, after fresh clone (also: `just install-deps`)
ROOK_BIN=$PWD/../../target/debug/rook pnpm tauri dev
```

Set `ROOK_BIN` so the desktop spawns the right `rook serve` binary (see [Desktop](desktop.md) for why).

## Run checks

```bash
cargo check                  # quick compile check
cargo test                   # run all rust tests
cargo fmt                    # format
cargo clippy                 # lint
```

## Frontend checks

```bash
cd ui/rook
pnpm typecheck
pnpm lint
pnpm test                    # vitest
```

## ACP schema and generated types

If you change `crates/rook-acp` types, regenerate the schema and TypeScript types so CI's `Check Generated Schemas are Up-to-Date` job stays green:

```bash
just generate-acp-types      # regenerates schema + TS types in one step
just check-acp-schema        # verifies they're in sync (CI runs this)
```

## Common Justfile targets

```bash
just rook                    # cargo run the CLI
just run-ui                  # run the Tauri dev server (UI only)
just run-dev                 # build CLI in release mode, then run the desktop
just package-ui              # build a desktop release bundle
just check-everything        # run all style checks (precommit gate)
just install-deps            # one-time UI workspace setup
```

`just --list` shows everything (some recipes are intentionally undocumented and only show up via `grep "^[a-z]" Justfile`).

## Project layout

```
crates/
  rook/             core agent runtime, providers, MCP, model abstraction
  rook-acp/         ACP server implementation
  rook-acp-macros/  proc macros for ACP custom methods
  rook-cli/         the `rook` binary, TUI, and command surface
  rook-mcp/         MCP server implementation
  rook-sdk/         Rust SDK for embedding rook
  rook-test/        integration tests
ui/
  rook/             Tauri desktop app (Vite + React renderer, Rust backend)
  rook-binary/*     platform-specific binary packages
  sdk/              TypeScript SDK (generated from ACP schema)
  text/             documentation site
docs/
  integrations/     design docs and the project manifesto
```

## Smoke tests for runtime changes

If you touch permission handling, the rook serve sidecar, or the Sentinel path, run the manual gates documented in [the manifesto](integrations/rook-dax-project-manifesto.md#smoke-test-gates).
