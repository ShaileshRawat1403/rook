import type { RookContextSnapshot } from "./contextSnapshot";
import type { ExecutionPosture, TonePosture } from "./types";

const RECOVERY_SIGNALS = ["you broke it", "failed", "broken", "not working"];
const FAST_LANE_SIGNALS = ["just do it", "just build", "stop asking"];
const RESET_SIGNALS = [
  "too much",
  "overkill",
  "over expanded",
  "over-expanded",
];
const LIGHT_WIT_SIGNALS = ["compliance", "bureaucracy", "caution"];

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

export function chooseTonePosture(
  request: string,
  posture: ExecutionPosture,
  _context: RookContextSnapshot,
): TonePosture {
  const text = request.toLowerCase().replace(/\s+/g, " ").trim();

  if (includesAny(text, RECOVERY_SIGNALS)) return "recovery";
  if (posture === "hard_stop" || posture === "review_required") {
    return "firm_boundary";
  }
  if (includesAny(text, FAST_LANE_SIGNALS)) return "compressed_fast_lane";
  if (includesAny(text, RESET_SIGNALS)) return "calm_reset";
  if (includesAny(text, LIGHT_WIT_SIGNALS)) return "light_wit";

  return "neutral";
}
