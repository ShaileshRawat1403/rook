import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { getSentinel, type SentinelMode } from "@/shared/api/sentinel";

const LABELS: Record<SentinelMode, string> = {
  off: "DAX: off",
  dax: "DAX: guarded",
};

/**
 * Read-only indicator for the active DAX Sentinel mode.
 *
 * v0.1 only: shows whether the session is being watched by DAX.
 * No interactivity, no fail-open state, no policy details.
 */
export function SentinelBadge() {
  const [mode, setMode] = useState<SentinelMode>("off");

  useEffect(() => {
    let cancelled = false;
    void getSentinel().then((sentinel) => {
      if (!cancelled) setMode(sentinel.mode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Badge
      variant={mode === "dax" ? "default" : "secondary"}
      title={
        mode === "dax"
          ? "DAX Sentinel is evaluating tool permission requests"
          : "DAX Sentinel is disabled (set ROOK_SENTINEL=dax to enable)"
      }
    >
      {LABELS[mode]}
    </Badge>
  );
}
