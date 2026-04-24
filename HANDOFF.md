# Handoff: Rook Desktop App Enhancements

## Current Status

### Branch
- `main` - all changes committed

### Recent Commits
```
b59806af feat: add RookGreeting animation to home screen
dd8e1b30 fix: resolve clippy warnings in rook-cli and add missing providers
dbc5857c fix: remove deep-link plugin causing multiple app instances
```

## Completed Work

### 1. Animation Components
Created in `ui/rook/src/shared/ui/animations/`:
- `RookBirdSpinner.tsx` - 6-frame bird animation for streaming state
- `StatusGlyphSpinner.tsx` - cycling thinking icons
- `LoadingIndicator.tsx` - state-driven loading component
- `RookGreeting.tsx` - animated text with SplitType
- `useRookTextAnimator.tsx` - hook for text animations
- `index.ts` - barrel exports

### 2. Providers Added
- `gemini_oauth` and `gemini_cli` added to provider catalog
- `nativeConnectQuery` added for OAuth providers

### 3. Tauri Desktop Features
- System tray with Show/Hide, Quit menu items
- Global shortcuts registration
- Single-instance protection

### 4. Bug Fixes
- Fixed clippy warnings in `rook-cli` (projection.rs, chat.rs)
- Fixed `split-type` dependency installation issue (workspace symlink)

## Issue to Fix

### Greeting Position Bug
**Location:** `ui/rook/src/features/home/ui/HomeScreen.tsx`

**Problem:** The RookGreeting appears below the clock instead of at the top of the screen.

**Current Layout (lines 122-126):**
```tsx
{/* Clock */}
<HomeClock />

{/* Greeting */}
<RookGreeting className="mb-6 pl-4 text-xl font-normal font-display text-muted-foreground" />
```

**Required Fix:** Move RookGreeting ABOVE HomeClock so the greeting appears first at the top of the screen.

**Expected Layout:**
```tsx
{/* Greeting - should be at top */}
<RookGreeting className="mb-6 pl-4 text-xl font-normal font-display text-muted-foreground" />

{/* Clock */}
<HomeClock />
```

## How to Test

1. Run the app:
```bash
cd /Users/Shailesh/MYAIAGENTS/rook
source bin/activate-hermit
just run-ui
```

2. Verify on the home screen:
   - Greeting text should appear at the TOP of the screen
   - Greeting should animate (characters scramble then resolve)
   - Clock should appear below the greeting

## Commands to Run After Fix

```bash
# Format and lint
cargo fmt
cargo clippy --all-targets -- -D warnings

# UI checks
cd ui/rook && pnpm check && pnpm typecheck

# Commit
git add -A
git commit -s
git push
```

## Relevant Files

| File | Purpose |
|------|---------|
| `ui/rook/src/features/home/ui/HomeScreen.tsx` | Home screen - greeting position |
| `ui/rook/src/shared/ui/animations/RookGreeting.tsx` | Animated greeting component |
| `ui/rook/src/shared/ui/animations/useRookTextAnimator.tsx` | Text animation hook |
| `ui/rook/src-tauri/src/lib.rs` | Tauri setup (tray, shortcuts, single instance) |
| `ui/rook/src-tauri/src/services/provider_defs.rs` | Provider definitions |
| `ui/rook/src/features/providers/providerCatalog.ts` | Frontend provider catalog |