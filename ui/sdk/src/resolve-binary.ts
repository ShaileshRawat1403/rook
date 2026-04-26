import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const PLATFORMS: Record<string, string> = {
  "darwin-arm64": "@shaileshrawat/rook-binary-darwin-arm64",
  "darwin-x64": "@shaileshrawat/rook-binary-darwin-x64",
  "linux-arm64": "@shaileshrawat/rook-binary-linux-arm64",
  "linux-x64": "@shaileshrawat/rook-binary-linux-x64",
  "win32-x64": "@shaileshrawat/rook-binary-win32-x64",
};

/**
 * Resolves the path to the rook binary.
 *
 * Resolution order:
 *   1. `ROOK_BINARY` environment variable (explicit override)
 *   2. Platform-specific `@shaileshrawat/rook-binary-*` optional dependency
 *
 * @throws if no binary can be found
 */
export function resolveRookBinary(): string {
  const envBinary = process.env.ROOK_BINARY;
  if (envBinary) return envBinary;

  const key = `${process.platform}-${process.arch}`;
  const pkg = PLATFORMS[key];
  if (!pkg) {
    throw new Error(
      `No rook binary available for ${key}. Set ROOK_BINARY to the path of a rook binary.`,
    );
  }

  try {
    const require = createRequire(import.meta.url);
    const pkgDir = dirname(require.resolve(`${pkg}/package.json`));
    const binName = process.platform === "win32" ? "rook.exe" : "rook";
    return join(pkgDir, "bin", binName);
  } catch {
    throw new Error(
      `rook binary package ${pkg} is not installed. Set ROOK_BINARY or install the native package.`,
    );
  }
}