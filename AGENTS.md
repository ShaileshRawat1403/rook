# AGENTS Instructions

rook is an AI agent framework in Rust with a CLI and a Tauri web UI (ui/rook).

## Setup
```bash
source bin/activate-hermit
cargo build
```

## Commands

### Build
```bash
cargo build                   # debug
cargo build --release         # release
just release-binary           # release CLI
```

### Test
```bash
cargo test                   # all tests
cargo test -p rook          # specific crate
cargo test --package rook --test mcp_integration_test
just record-mcp-tests        # record MCP
```

### Lint/Format
```bash
cargo fmt
cargo clippy --all-targets -- -D warnings
```

### UI
```bash
just run-ui                  # start Tauri app (ui/rook)
just lint-ui                 # biome + typecheck
just package-ui              # bundle Tauri app
```

### Git
```bash
git commit -s                # required for DCO sign-off
```

## Structure
```
crates/
├── rook              # core logic
├── rook-acp          # Agent Client Protocol
├── rook-acp-macros   # ACP proc macros
├── rook-cli          # CLI entry (also hosts `rook serve` ACP server)
├── rook-mcp          # MCP extensions
├── rook-sdk          # SDK crate
└── rook-test-support # test helpers

ui/rook/               # Tauri app (frontend + src-tauri)
ui/sdk/                # ACP TypeScript SDK consumed by ui/rook
evals/open-model-gym/  # benchmarking / evals
```

## Development Loop
```bash
# 1. source bin/activate-hermit
# 2. Make changes
# 3. cargo fmt
```

### Run these only if the user has asked you to build/test your changes:
```
# 1. cargo build
# 2. cargo test -p <crate>
# 3. cargo clippy --all-targets -- -D warnings
# 4. [if ACP schema changed] just check-acp-schema
```

## Rules

Test: Prefer tests/ folder, e.g. crates/rook/tests/
Test: When adding features, update rook-self-test.yaml, rebuild, then run `rook run --recipe rook-self-test.yaml` to validate
Error: Use anyhow::Result
Provider: Implement Provider trait see providers/base.rs
MCP: Extensions in crates/rook-mcp/
ACP: Schema changes need `just generate-acp-types` (regenerates ui/sdk types)

## Code Quality

Comments: Write self-documenting code - prefer clear names over comments
Comments: Never add comments that restate what code does
Comments: Only comment for complex algorithms, non-obvious business logic, or "why" not "what"
Simplicity: Don't make things optional that don't need to be - the compiler will enforce
Simplicity: Booleans should default to false, not be optional
Errors: Don't add error context that doesn't add useful information (e.g., `.context("Failed to X")` when error already says it failed)
Simplicity: Avoid overly defensive code - trust Rust's type system
Logging: Clean up existing logs, don't add more unless for errors or security events

## Ink / Terminal UI (ui/text)

Ink renders React to a fixed character grid — not a browser. Content that exceeds a Box's
dimensions is NOT clipped; it visually overflows into neighboring cells and breaks the layout.

Ink-Text: Never use `wrap="wrap"` inside a fixed-height Box — wrapped text can exceed the
  Box height and bleed into adjacent components. Use `wrap="truncate"` and pre-truncate the
  string to fit the available character budget (lines × width).
Ink-Layout: When changing card/cell dimensions, always recalculate how much content fits.
  Account for borders (2 chars), padding, margins, and sibling elements when computing the
  remaining space for dynamic text.
Ink-Overflow: Ink has no `overflow: hidden`. The only way to prevent overflow is to ensure
  content never exceeds the container size — truncate text, limit list items, or cap height.
Ink-FlexGrow: Avoid `flexGrow={1}` on text containers inside fixed-height cards — the text
  will try to fill available space but Ink won't clip it if it exceeds the boundary.
Ink-HeightBudget: When computing how many rows/items fit vertically, count EVERY line used
  by headers, footers, margins, borders, and scroll indicators. Under-reserving vertical
  space (e.g., `height - 8` when chrome actually uses 16 lines) causes Ink to squeeze out
  margins between items, making borders collapse. Always audit the actual line count.
Ink-TrailingMargin: Don't apply `marginBottom` to the last item in a list — it wastes a
  line and can push content out of the container. Use conditional margins or container `gap`.

## Never

Never: Edit generated ACP types under ui/sdk/src/generated/ manually
Never: Edit Cargo.toml use cargo add
Never: Skip cargo fmt
Never: Merge without running clippy
Never: Comment self-evident operations (`// Initialize`, `// Return result`), getters/setters, constructors, or standard Rust idioms

## Entry Points
- CLI: crates/rook-cli/src/main.rs
- ACP server: `rook serve` subcommand in crates/rook-cli
- UI: ui/rook/src/main.tsx (frontend), ui/rook/src-tauri/src/lib.rs (Tauri host)
- Agent: crates/rook/src/agents/agent.rs
