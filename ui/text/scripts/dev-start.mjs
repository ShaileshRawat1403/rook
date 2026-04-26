#!/usr/bin/env node

// Development entrypoint: ensures a rook binary is available, then launches
// the TUI via tsx. Skips the cargo build if ROOK_BINARY is already set.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

if (!process.env.ROOK_BINARY) {
  const binName = process.platform === "win32" ? "rook.exe" : "rook";
  const binaryPath = join(repoRoot, "target", "debug", binName);

  console.log("Building rook (debug)…
  execFileSync("cargo", ["build", "-p", "rook-cli"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (!existsSync(binaryPath)) {
    console.error(`Build succeeded but binary not found at ${binaryPath}`);
    process.exit(1);
  }

  process.env.ROOK_BINARY = binaryPath;
}

execFileSync("tsx", [join(__dirname, "..", "src", "tui.tsx"), ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});
