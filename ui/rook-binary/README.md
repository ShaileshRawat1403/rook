# Native Binary Packages for rook

This directory contains the npm package scaffolding for distributing the
`rook` Rust binary as platform-specific npm packages.

## Packages

| Package | Platform |
|---------|----------|
| `@shaileshrawat/rook-binary-darwin-arm64` | macOS Apple Silicon |
| `@shaileshrawat/rook-binary-darwin-x64` | macOS Intel |
| `@shaileshrawat/rook-binary-linux-arm64` | Linux ARM64 |
| `@shaileshrawat/rook-binary-linux-x64` | Linux x64 |
| `@shaileshrawat/rook-binary-win32-x64` | Windows x64 |

## Building

From the repository root:

```bash
# Build for current platform only
cd ui/sdk
pnpm run build:native

# Build for all platforms (requires cross-compilation toolchains)
pnpm run build:native:all

# Build for specific platform(s)
pnpm exec tsx scripts/build-native.ts darwin-arm64 linux-x64
```

The built binaries are placed into `ui/rook-binary/rook-binary-{platform}/bin/`.
These directories are git-ignored.

## Publishing

Publishing is handled by GitHub Actions. See `.github/workflows/publish-npm.yml`.

For manual publishing:

```bash
# From repository root
./ui/scripts/publish.sh --real
```

This will publish all native packages along with `@shaileshrawat/rook-sdk`.

## Usage

These packages are installed as optional dependencies by `@shaileshrawat/rook-sdk` (the SDK).
The appropriate package for the user's platform is automatically selected during
installation.

See `ui/sdk/src/resolve-binary.ts` for how the binary path is resolved.