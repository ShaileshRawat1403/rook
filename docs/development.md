# Development

## Activate toolchain

```bash
source bin/activate-hermit
```

## Build CLI

```bash
cargo build -p rook-cli
```

## Run CLI

```bash
cargo run -p rook-cli -- --help
```

## Run desktop

```bash
cd ui/rook
pnpm install
pnpm tauri dev
```

## Run checks

```bash
cargo check
cargo test
cargo fmt
```
