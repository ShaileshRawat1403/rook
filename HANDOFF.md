# Handoff: Rook Tauri Feature Blend

## Current Status

### Branch
- `feature/rook-persona-and-art`

### Focus
- The migration phase is mostly over.
- The current work is feature blending and product stabilization.
- The controlling document is now [ROOK_FEATURE_BLEND_LEDGER.md](ROOK_FEATURE_BLEND_LEDGER.md).

## What Is Already Landed

- Rook greeting and crow-brand animation work is on this branch.
- Tauri shell behavior exists for:
  - single instance
  - tray
  - deep-link emission
  - global shortcut registration
  - notifications
- Provider catalog work has expanded model and agent setup coverage.
- Project working directories already feed ACP session preparation and updates.

## What Was Fixed In This Pass

- Replaced stale planning assumptions with the feature blend ledger.
- Removed the stale `main` branch claim from handoff guidance.
- Fixed the deep-link bridge so the frontend receives the actual `rook://...` URL shape instead of treating it as a string array.
- Routed native shortcut events through one frontend command path instead of mixing:
  - top-level listeners
  - `AppShell` keydown handling
  - Sidebar-local `Cmd+K` handling
- Added deep-link path parsing so routes like `rook://session/<id>` can be handled intentionally.

## Next Recommended Work

1. Run `just run-ui` on this feature branch.
2. Manually verify the shell features listed in the ledger.
3. Verify the golden product path:
   - configure a provider
   - restart the app
   - send a real chat
   - verify streaming and persistence
4. Only after that, port the dedicated working-directory switcher UX.

## Relevant Files

| File | Purpose |
|------|---------|
| `ROOK_FEATURE_BLEND_LEDGER.md` | Current control surface for feature status |
| `ui/rook/src/app/App.tsx` | Tauri shell event bridge with cleanup |
| `ui/rook/src/app/AppShell.tsx` | Central frontend handling for shell shortcuts and deep links |
| `ui/rook/src/features/sidebar/ui/Sidebar.tsx` | Sidebar search focus integration |
| `ui/rook/src-tauri/src/lib.rs` | Tauri tray, single instance, notifications, and shortcut registration |
