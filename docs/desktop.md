# Rook Desktop

Rook Desktop is the Tauri-based desktop surface for Rook. It exposes the same agent runtime as the CLI but adds a graphical interface for chat, provider setup, project management, and session inspection.

## Run in development

```bash
cd /path/to/rook
source bin/activate-hermit
cargo build -p rook-cli

cd ui/rook
ROOK_BIN=$PWD/../../target/debug/rook pnpm tauri dev
```

`ROOK_BIN` matters. The Tauri app needs to know where the real `rook` CLI binary lives so it can spawn `rook serve` for the chat connection. Without it, the dev process can fall back to spawning the Tauri app binary itself, which doesn't speak the `serve` subcommand and exits immediately. If you see `Rook serve exited before becoming ready: exit status: 0`, that's the cause — set `ROOK_BIN` and relaunch.

## Optional: enable DAX Sentinel

The desktop app supports an optional governance layer through DAX. With Sentinel enabled, every permission-producing tool call the agent proposes is evaluated by DAX before execution. The mode badge in the top bar shows current state (`DAX: off` or `DAX: open`).

```bash
ROOK_SENTINEL=dax \
ROOK_BIN=$PWD/../../target/debug/rook \
pnpm tauri dev
```

You can also toggle the mode at runtime by clicking the badge in the top bar. The selected mode is persisted to local storage.

See the [DAX Agent + Sentinel design doc](integrations/dax-agent-and-sentinel.md) for the full integration model.

## Build a release bundle

```bash
just package-ui
```

Outputs a platform-specific bundle under `ui/rook/src-tauri/target/release/bundle/`.

## Architecture in one paragraph

The desktop renderer is a Vite + React app talking to a Tauri Rust backend (`ui/rook/src-tauri`). The Rust backend spawns `rook serve` as a sidecar and proxies WebSocket-based ACP traffic between the renderer and the rook agent runtime. Provider setup, project switching, MCP extensions, and the DAX Sentinel hook all live in this layer.
