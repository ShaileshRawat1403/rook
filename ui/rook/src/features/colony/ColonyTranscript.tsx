import { Bot, User, Eye, Clock, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useColonyStore } from "./colonyStore";
import { ScrollArea } from "@/shared/ui/scroll-area";
import type { ColonyEvent, ColonyEventType } from "./types";

const ROLE_ICONS = {
  planner: Bot,
  worker: User,
  reviewer: Eye,
};

const EVENT_TYPE_LABELS: Record<ColonyEventType, string> = {
  colony_created: "Colony created",
  seat_linked: "Session linked",
  seat_unlinked: "Session unlinked",
  seat_model_changed: "Model changed",
  active_seat_changed: "Active seat changed",
  sentinel_mode_changed: "Sentinel mode changed",
  session_opened: "Session opened",
  task_created: "Task created",
  task_assigned: "Task assigned",
  task_status_changed: "Task status changed",
  task_deleted: "Task deleted",
  handoff_created: "Handoff created",
  handoff_updated: "Handoff updated",
  handoff_copied: "Handoff copied",
  handoff_deleted: "Handoff deleted",
};

interface ColonyTranscriptProps {
  maxEntries?: number;
}

function EventDetailPanel({
  event,
  onClose,
}: {
  event: ColonyEvent;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Evidence Details</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Event</span>
          <span className="font-medium">{EVENT_TYPE_LABELS[event.type]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Timestamp</span>
          <span>{new Date(event.timestamp).toLocaleString()}</span>
        </div>
        {event.seatLabel && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">[{event.seatLabel}]</span>
          </div>
        )}
        {event.taskTitle && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Task</span>
            <span className="font-medium">{event.taskTitle}</span>
          </div>
        )}
        {event.details && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Details</span>
            <span className="rounded bg-muted p-2">{event.details}</span>
          </div>
        )}
        {event.handoffId && event.type.startsWith("handoff") && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Handoff ID</span>
            <span className="font-mono text-[10px]">
              {event.handoffId.slice(0, 8)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ColonyTranscript({ maxEntries = 20 }: ColonyTranscriptProps) {
  const events = useColonyStore((state) => state.events);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const displayEvents = events.slice(-maxEntries).reverse();
  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId) ?? null
    : null;

  if (displayEvents.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Colony Activity
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Activity logs coordination events only. It does not include chat messages.
        </p>
        <p className="text-sm text-muted-foreground">
          No activity yet. Create a task to start coordinating.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex flex-col border-b border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Colony Activity
        </div>
        <p className="text-xs text-muted-foreground">
          Evidence trail for role changes, task movement, and handoffs. Chat
          stays inside each session.
        </p>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-2">
          {displayEvents.map((event) => {
            const RoleIcon = event.seatRole ? ROLE_ICONS[event.seatRole] : null;
            const isSelected = selectedEventId === event.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                className={`flex items-start gap-2 text-sm text-left ${
                  isSelected ? "rounded bg-muted p-2 -mx-2" : ""
                }`}
              >
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
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
                <ChevronRight
                  className={`mt-0.5 h-3 w-3 ${
                    isSelected
                      ? "rotate-90 transition-transform"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {selectedEvent && (
        <div className="border-t border-border p-3">
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEventId(null)}
          />
        </div>
      )}
    </div>
  );
}