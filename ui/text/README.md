# rook ACP TUI

Early stage and part of rook's broader move to ACP

https://github.com/ShaileshRawat1403/rook/issues

## Running

The TUI automatically launches the rook ACP server using the `rook acp` command.

### Development (from source)

When running from source, `pnpm start` automatically builds the Rust binary from the workspace root if needed:

```bash
cd ui/text
pnpm install
pnpm run start
```

The `dev:binary` script checks if the Rust binary needs rebuilding by comparing timestamps of:
- `target/release/rook` binary
- `Cargo.toml` and `Cargo.lock` 
- `crates/rook-cli/Cargo.toml`

If any source files are newer, it runs `cargo build --release -p rook-cli` automatically.

### Production (with prebuilt binaries)

In production, the TUI uses prebuilt binaries from the `@shaileshrawat/rook-binary-*` packages installed via `postinstall`.

### Custom server URL

To use a custom server URL instead of the built-in binary:

```bash
pnpm run start -- --server http://localhost:8080
```