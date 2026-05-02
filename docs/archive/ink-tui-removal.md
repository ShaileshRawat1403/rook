# Ink TUI Removal Notes

`ui/text` was an early TypeScript/Ink ACP TUI. It was removed because Rook now standardizes terminal UX on the Rust `rook-cli` Ratatui implementation.

## Useful Concepts Preserved

- ACP client mode for terminal UIs
- Custom server URL support (`ROOK_SERVE_URL` env var)
- Prebuilt platform binary packaging for distributions
- Lightweight terminal interaction model

## Canonical Terminal UI

- **Location**: `crates/rook-cli`
- **Framework**: Ratatui (Rust)
- **Status**: Active, canonical terminal experience

## Removal Date

2026-05-02

## Affected Files Removed

- `ui/text/` (entire package)
- Workspace references in `ui/package.json` and `ui/pnpm-workspace.yaml`
- Publish steps in `ui/scripts/publish.sh`
- Ink-specific guidance in root `AGENTS.md`
