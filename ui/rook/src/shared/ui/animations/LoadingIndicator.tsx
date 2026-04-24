import { useTranslation } from "react-i18next";
import { RookLogo } from "@/shared/ui/RookLogo";
import { StatusGlyphSpinner } from "./StatusGlyphSpinner";
import { CrowFlap } from "./CrowFlap";

export type ChatLoadingState =
  | "loading-conversation"
  | "thinking"
  | "streaming"
  | "waiting-for-user"
  | "compacting"
  | "idle"
  | "restarting-agent";

interface LoadingIndicatorProps {
  message?: string;
  chatState?: ChatLoadingState;
}

const STATE_ICONS: Record<ChatLoadingState, React.ReactNode> = {
  "loading-conversation": (
    <StatusGlyphSpinner className="flex-shrink-0" cycleInterval={600} />
  ),
  thinking: (
    <StatusGlyphSpinner className="flex-shrink-0" cycleInterval={600} />
  ),
  streaming: <CrowFlap className="flex-shrink-0 h-4 w-4" />,
  "waiting-for-user": (
    <StatusGlyphSpinner
      className="flex-shrink-0"
      cycleInterval={600}
      variant="waiting"
    />
  ),
  compacting: (
    <StatusGlyphSpinner className="flex-shrink-0" cycleInterval={600} />
  ),
  idle: <RookLogo size="small" />,
  "restarting-agent": (
    <StatusGlyphSpinner className="flex-shrink-0" cycleInterval={600} />
  ),
};

const STATE_MESSAGE_KEYS: Record<ChatLoadingState, string> = {
  "loading-conversation": "loadingRook.loadingConversation",
  thinking: "loadingRook.thinking",
  streaming: "loadingRook.streaming",
  "waiting-for-user": "loadingRook.waiting",
  compacting: "loadingRook.compacting",
  idle: "loadingRook.idle",
  "restarting-agent": "loadingRook.restartingAgent",
};

export function LoadingIndicator({
  message,
  chatState = "idle",
}: LoadingIndicatorProps) {
  const { t } = useTranslation();
  const displayMessage = message || t(STATE_MESSAGE_KEYS[chatState]);
  const icon = STATE_ICONS[chatState];

  return (
    <div className="w-full animate-fade-slide-up">
      <div
        data-testid="loading-indicator"
        className="flex items-center gap-2 text-xs text-foreground/60 py-2"
      >
        {icon}
        {displayMessage}
      </div>
    </div>
  );
}
