import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import {
  getConfiguredSentinelMode,
  setConfiguredSentinelMode,
  type SentinelMode,
} from "@/shared/api/sentinel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const LABELS: Record<SentinelMode, string> = {
  off: "DAX: off",
  dax_open: "DAX: open",
};

const DESCRIPTIONS: Record<SentinelMode, string> = {
  off: "Sentinel disabled. Rook preserves legacy permission behavior.",
  dax_open:
    "DAX evaluates permission requests. If DAX is unavailable, Rook fails open.",
};

/**
 * v0.1 mode switch. Guarded/Locked are intentionally visible but disabled
 * until approval UI exists, so stricter modes are never implied silently.
 */
export function SentinelBadge() {
  const [mode, setMode] = useState<SentinelMode>("off");

  useEffect(() => {
    let cancelled = false;
    
    const fetchMode = () => {
      void getConfiguredSentinelMode().then((nextMode) => {
        if (!cancelled) setMode(nextMode);
      });
    };
    
    fetchMode();
    
    const listener = () => fetchMode();
    if (typeof window !== "undefined") {
      window.addEventListener("sentinel-mode-changed", listener);
      // Also listen to storage events to sync across tabs if needed
      window.addEventListener("storage", listener);
    }
    
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("sentinel-mode-changed", listener);
        window.removeEventListener("storage", listener);
      }
    };
  }, []);

  function handleModeChange(nextMode: string) {
    if (nextMode !== "off" && nextMode !== "dax_open") {
      return;
    }
    setConfiguredSentinelMode(nextMode);
    setMode(nextMode);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sentinel-mode-changed"));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title={DESCRIPTIONS[mode]}
        >
          <Badge variant={mode === "dax_open" ? "default" : "secondary"}>
            {LABELS[mode]}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>DAX Sentinel mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
          <DropdownMenuRadioItem value="off">
            <div className="flex flex-col">
              <span>Off</span>
              <span className="text-xs text-muted-foreground">
                Preserve legacy behavior.
              </span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dax_open">
            <div className="flex flex-col">
              <span>DAX Open</span>
              <span className="text-xs text-muted-foreground">
                Evaluate with DAX; fail open if unavailable.
              </span>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioItem value="dax_guarded" disabled>
          <div className="flex flex-col">
            <span>DAX Guarded</span>
            <span className="text-xs text-muted-foreground">
              Requires approval fallback UI.
            </span>
          </div>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dax_locked" disabled>
          <div className="flex flex-col">
            <span>DAX Locked</span>
            <span className="text-xs text-muted-foreground">
              Requires fail-closed policy UI.
            </span>
          </div>
        </DropdownMenuRadioItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
