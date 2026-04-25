# Rook Feature Blend Ledger

## Current Branch
- `feature/rook-persona-and-art`

## Principle
Blend proven UX behaviors into a Tauri-native Rook product.

Do not port Electron internals.
Port the user-visible outcomes that still improve real work in Rook.

## Status Legend
- Done
- Needs manual verification
- Needs frontend wiring
- Needs Tauri implementation
- Deferred
- Dropped

## Native Shell

| Feature | Status | Notes |
|---|---|---|
| Single instance | Done | Implemented in `ui/rook/src-tauri/src/lib.rs` with `tauri-plugin-single-instance`. |
| Tray | Done, needs manual verification | Tray menu exposes Show/Hide and Quit. Verify actual packaged behavior and click handling. |
| Deep links | Done, needs manual verification | `rook://` links are emitted by the Tauri shell and now bridged into the frontend with path parsing. Verify `rook://settings`, `rook://projects`, and `rook://session/<id>`. |
| Notifications | Done, needs manual verification | Native notification commands and frontend notification hook exist. Verify permission flow and duplicate suppression. |
| Global shortcuts | Done, needs manual verification | Native shortcuts are registered in Tauri and routed through one frontend command path. Verify `Cmd+,`, `Cmd+B`, `Cmd+N`, `Cmd+K`. |
| Window state persistence | Done | Backed by `tauri-plugin-window-state`. |
| Zoom shortcuts | Done | Frontend zoom hook handles `Cmd/Ctrl +`, `-`, `0`. |

## Core Product Flow

| Feature | Status | Notes |
|---|---|---|
| Provider config | Needs manual verification | Tauri provider setup exists, but needs a real save/restart/reload check on this branch. |
| Chat send/receive | Needs manual verification | ACP startup and chat surfaces are wired. Must verify a real prompt on the feature branch with a configured provider. |
| ACP connection | Needs manual verification | Startup path initializes ACP and notification handler. Needs reconnect/stream sanity pass. |
| Session persistence | Needs manual verification | Session store loads on startup. Verify chat survives restart with expected title/history. |
| Project-backed working directories | Done, needs manual verification | Project working dirs are already resolved into ACP session prep/update. Needs a real project chat test. |
| Dedicated working-dir switcher UX | Needs frontend wiring | Backend/session behavior exists in project flows, but there is no dedicated high-signal switcher surface yet. |

## UX / Feature Blend

| Feature | Status | Decision |
|---|---|---|
| Animated greeting | Done, needs visual check | Keep. Hero placement is already fixed on this branch. |
| Crow spinner | Done, needs visual check | Keep. Active branding work is happening in `CrowFlap`. |
| Sidebar resize and snap-collapse | Done, needs manual verification | Keep. Present in `AppShell`. |
| Sidebar search focus shortcut | Done, needs manual verification | Keep. Now routed through the shell command path instead of a local keydown listener. |
| Session history search | Done | Keep. |
| Sidebar activity indicators | Partial | Existing unread/running state exists; a richer activity system can wait. |
| Context window usage UI | Deferred | Useful, but not before provider/chat stability. |
| `/edit` command | Deferred | Not before the golden provider/chat path is stable. |
| Auto-updater | Deferred | Release engineering task, not product flow. |
| Dock/menu-bar polish | Deferred | Do after core flow and asset stabilization. |

## Current Priorities

1. Manually verify provider setup, chat send/receive, streaming, and session persistence in `ui/rook`.
2. Verify shell behaviors on the feature branch: tray, single instance, deep links, notifications, shortcuts.
3. Port a dedicated working-directory switcher only after the golden path is stable.

## Manual Verification Checklist

- `just run-ui`
- Launch the app twice and confirm only one usable instance exists.
- Verify tray Show/Hide/Quit works.
- Verify `rook://settings`, `rook://projects`, and `rook://session/<id>` focus the app and route correctly.
- Verify `Cmd+,`, `Cmd+B`, `Cmd+N`, and `Cmd+K`.
- Configure one provider, restart the app, and confirm the provider remains configured.
- Start a real chat and confirm:
  - thinking state appears
  - streaming renders correctly
  - crow spinner appears during work
  - final response persists after navigation/restart

## Explicitly Not Next

- Broad Electron-parity porting
- Auto-updater work
- Recreating preload or Electron IPC patterns
- Random feature ports that do not improve real work in the Tauri product

## Borrowed vs Improved Beyond Electron

Polish pass on `feature/rook-persona-and-art`.

### Borrowed (from electron `ui/desktop`)
- Hero greeting at the top of the home composition (the SessionInsights/Greeting block in `Hub.tsx`).
- Slash command surface — adapted the electron command set into a Tauri-native composer-integrated panel.
- Chat header rhythm: assistant identity row + content + hover-only timestamp/actions.
- Loading-icon-in-the-stream placement (matching message timeline width and indent).

### Improved beyond electron
- Single bird identity for both static logo and motion spinner (electron split the watermark, the loading bird, and the sidebar mark across three different art assets).
- Slash panel rendered as an integrated suggestion layer inside the composer (no nested card/border), with inline keyboard hint.
- Agent/model picker no longer collapses to a bare `Loading…` string — replaced with a skeleton-row stack and explicit "loading models" label that survives slow provider startup.
- Eager-loaded i18n namespaces — avoids the first-render flash of raw translation keys that electron's react-intl path was already immune to but our react-i18next lazy-load path suffered from.
- Home clock demoted from hero text-6xl to a quiet timestamp under the greeting; greeting + clock + composer now anchor as one composition instead of three islands.
- Sidebar header logo trimmed (size-4 expanded, size-5 collapsed) so it stops competing with nav items for prime space.
