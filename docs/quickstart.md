# Quickstart

Rook is a local AI agent for terminal and desktop workflows. This page gets you to a running instance in under five minutes.

## Build from source

```bash
git clone https://github.com/ShaileshRawat1403/rook.git
cd rook
source bin/activate-hermit
cargo build -p rook-cli
```

Hermit pulls in pinned versions of cargo, node, pnpm, and the rest of the toolchain so you don't need to install anything globally.

## First run

```bash
./target/debug/rook
```

`rook` with no arguments opens the terminal interface (TUI). The first run will guide you through provider setup — pick a model provider, sign in or paste an API key, and the TUI takes over from there.

## Single-shot mode

For non-interactive use:

```bash
./target/debug/rook run --text "Summarize what this project does."
```

## Help

```bash
./target/debug/rook --help
```

Lists every subcommand. See [CLI reference](cli.md) for what each one does.

## Desktop app

If you prefer a graphical surface:

```bash
cd ui/rook
ROOK_BIN=$PWD/../../target/debug/rook pnpm tauri dev
```

The `ROOK_BIN` variable is important during development — without it the desktop app may try to spawn the wrong binary. See [Desktop](desktop.md).

## Next

- [CLI reference](cli.md)
- [Providers](providers.md)
- [Configuration](configuration.md)
- [Origin](origin.md) — where Rook came from
