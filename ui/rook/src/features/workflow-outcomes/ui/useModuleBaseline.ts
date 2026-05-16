import { useEffect, useState } from "react";
import { getModuleBaseline, type ModuleBaseline } from "../baseline";

export type ModuleBaselineState =
  | { status: "loading" }
  | { status: "empty"; baseline: ModuleBaseline }
  | { status: "ready"; baseline: ModuleBaseline }
  | { status: "error" };

// Per-process cache keyed by moduleId@version. Avoids re-fetching when the
// user toggles between recipes in the selector. Refresh-on-run-complete is
// deferred to v0.2 (OUTCOMES_BASELINE_DISPLAY_V0_1.md § Open questions).
const cache = new Map<string, ModuleBaselineState>();

function cacheKey(moduleId: string, moduleVersion: string): string {
  return `${moduleId}@${moduleVersion}`;
}

export function useModuleBaseline(
  moduleId: string,
  moduleVersion: string,
): ModuleBaselineState {
  const key = cacheKey(moduleId, moduleVersion);
  const [state, setState] = useState<ModuleBaselineState>(
    cache.get(key) ?? { status: "loading" },
  );

  useEffect(() => {
    const cached = cache.get(key);
    if (cached) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    getModuleBaseline(moduleId, moduleVersion)
      .then((baseline) => {
        if (cancelled) return;
        const next: ModuleBaselineState =
          baseline.total === 0
            ? { status: "empty", baseline }
            : { status: "ready", baseline };
        cache.set(key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ModuleBaselineState = { status: "error" };
        cache.set(key, next);
        setState(next);
      });

    return () => {
      cancelled = true;
    };
  }, [key, moduleId, moduleVersion]);

  return state;
}

// Test-only export: lets unit tests reset the per-process cache between cases.
export function __resetModuleBaselineCache(): void {
  cache.clear();
}
