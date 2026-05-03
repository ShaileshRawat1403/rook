import { Bot, User, Eye, Clock } from "lucide-react";
import { useColonyStore } from "./colonyStore";
import { ScrollArea } from "@/shared/ui/scroll-area";

const ROLE_ICONS = {
  planner: Bot,
  worker: User,
  reviewer: Eye,
};

const EVENT_LABELS = {
  colony_created: "Colony created",
  seat_linked: "Session linked",
  seat_unlinked: "Session unlinked",
  active_seat_changed: "Active seat changed",
  sentinel_mode_changed: "Sentinel mode changed",
  session_opened: "Session opened",
};

interface ColonyTranscriptProps {
  maxEntries?: number;
}

export function ColonyTranscript({ maxEntries = 20 }: ColonyTranscriptProps) {
  const events = useColonyStore((state) => state.events);

  const displayEvents = events.slice(-maxEntries).reverse();

  if (displayEvents.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Colony Activity
        </div>
        <p className="text-sm text-muted-foreground">
          No activity yet. Create a colony to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-3 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Colony Activity
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-2">
          {displayEvents.map((event) => {
            const RoleIcon = event.seatRole ? ROLE_ICONS[event.seatRole] : null;
            return (
              <div key={event.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                {RoleIcon && (
                  <RoleIcon className="mt-0.5 h-3 w-3 text-muted-foreground" />
                )}
                <span className="flex-1">
                  {event.seatLabel && (
                    <span className="font-medium">[{event.seatLabel}]</span>
                  )}{" "}
                  {EVENT_LABELS[event.type]}
                  {event.details && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({event.details})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
