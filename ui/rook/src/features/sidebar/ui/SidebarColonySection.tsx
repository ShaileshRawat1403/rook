import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Users } from "lucide-react";
import type { ColonySession } from "@/features/colony/types";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { SessionActivityIndicator } from "@/shared/ui/SessionActivityIndicator";

interface ColonyRoleRuntime {
  isRunning: boolean;
  hasUnread: boolean;
}

interface SidebarColonySectionProps {
  colony: ColonySession | null;
  collapsed: boolean;
  activeSessionId?: string | null;
  getRuntime: (sessionId: string) => ColonyRoleRuntime;
  onNavigate?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onItemMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  activeSessionRefCallback?: (el: HTMLElement | null) => void;
}

export function SidebarColonySection({
  colony,
  collapsed,
  activeSessionId,
  getRuntime,
  onNavigate,
  onSelectSession,
  onItemMouseEnter,
  activeSessionRefCallback,
}: SidebarColonySectionProps) {
  const { t } = useTranslation("sidebar");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!colony) return;
    if (colony.seats.some((seat) => seat.sessionId === activeSessionId)) {
      setExpanded(true);
    }
  }, [activeSessionId, colony]);

  if (!colony) return null;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 pt-4 pb-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={colony.title}
          aria-label={colony.title}
          onClick={onNavigate}
          className="rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <Users className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <section className="relative z-10 pt-4">
      <div className="px-3 pb-1 text-xs font-light uppercase tracking-wider text-muted-foreground">
        {t("sections.colony")}
      </div>
      <div className="relative flex items-center group rounded-md transition-colors duration-200">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          onMouseEnter={onItemMouseEnter}
          className="flex-1 min-w-0 justify-start gap-2 rounded-md px-3 py-2 text-[13px] font-light text-muted-foreground hover:bg-transparent hover:text-foreground group-hover:text-foreground"
        >
          <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
            {expanded ? (
              <IconChevronDown className="h-3 w-3" />
            ) : (
              <IconChevronRight className="h-3 w-3" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">
            {colony.title}
          </span>
        </Button>
      </div>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {colony.seats.map((seat) => {
            const isLinked = Boolean(seat.sessionId);
            const runtime = seat.sessionId
              ? getRuntime(seat.sessionId)
              : { isRunning: false, hasUnread: false };
            const isActive = activeSessionId === seat.sessionId;
            return (
              <button
                key={seat.id}
                type="button"
                ref={isActive ? activeSessionRefCallback : undefined}
                disabled={!seat.sessionId}
                onMouseEnter={onItemMouseEnter}
                onClick={() => {
                  if (seat.sessionId) {
                    onSelectSession?.(seat.sessionId);
                  }
                }}
                className={cn(
                  "flex min-h-8 w-full items-center gap-2 rounded-md py-2 pl-8 pr-3 text-left text-[13px] transition-colors duration-200",
                  isActive
                    ? "font-medium text-foreground"
                    : isLinked
                      ? "text-muted-foreground hover:text-foreground"
                      : "cursor-default text-muted-foreground/45",
                )}
              >
                {(runtime.isRunning || runtime.hasUnread) && (
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                    <SessionActivityIndicator
                      isRunning={runtime.isRunning}
                      hasUnread={runtime.hasUnread}
                    />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{seat.label}</span>
                {!isLinked && (
                  <span className="shrink-0 text-[11px] text-muted-foreground/50">
                    {t("colony.notLinked")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
