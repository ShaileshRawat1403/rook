import {
  Bot,
  User,
  Eye,
  Link,
  Unlink,
  ExternalLink,
  MessageSquare,
  Clock,
  FileText,
} from "lucide-react";
import type { ColonySeat, ChatSessionInfo, ColonyTask } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const ROLE_ICONS = {
  planner: Bot,
  worker: User,
  reviewer: Eye,
};

const ROLE_COLORS = {
  planner: "bg-blue-500",
  worker: "bg-green-500",
  reviewer: "bg-purple-500",
};

const STATUS_COLORS = {
  idle: "bg-muted text-muted-foreground",
  thinking: "bg-yellow-500 text-white",
  running: "bg-blue-500 text-white",
  waitingPermission: "bg-orange-500 text-white",
  blocked: "bg-red-500 text-white",
  done: "bg-green-500 text-white",
  failed: "bg-red-600 text-white",
};

const BINDING_LABELS = {
  unbound: "Unbound",
  linked: "Linked",
};

const BINDING_COLORS = {
  unbound: "bg-muted text-muted-foreground",
  linked: "bg-green-500 text-white",
};

interface ColonySeatCardProps {
  seat: ColonySeat;
  sessionInfo?: ChatSessionInfo;
  tasks?: ColonyTask[];
  isActive?: boolean;
  onCreateSession?: () => void;
  onOpenSession?: () => void;
  onUnbindSession?: () => void;
  onSelect?: () => void;
  onUpdateModel?: (seatId: string, modelName: string) => void;
}

export function ColonySeatCard({
  seat,
  sessionInfo,
  tasks,
  isActive,
  onCreateSession,
  onOpenSession,
  onUnbindSession,
  onSelect,
  onUpdateModel,
}: ColonySeatCardProps) {
  const Icon = ROLE_ICONS[seat.role];
  const roleColor = ROLE_COLORS[seat.role];
  const statusColor = STATUS_COLORS[seat.status];
  const bindingColor = BINDING_COLORS[seat.binding];
  const isBound = seat.binding === "linked";
  const canOpen = isBound && seat.sessionId;

  const assignedTask = tasks?.find((t) => t.assignedSeatId === seat.id);

  return (
    <Card className={`flex flex-col cursor-pointer ${isActive ? "ring-2 ring-accent" : ""}`} onClick={onSelect}>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <div className={`rounded-full p-2 ${roleColor}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{seat.label}</CardTitle>
          <p className="text-xs capitalize text-muted-foreground">
            {seat.role}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Session:</span>
          <Badge variant="secondary" className={bindingColor}>
            {BINDING_LABELS[seat.binding]}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant="secondary" className={statusColor}>
            {seat.status}
          </Badge>
        </div>

        {isBound && sessionInfo && (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <span className="text-xs font-medium">Session Preview</span>

            <div className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="truncate font-medium">
                {sessionInfo.title}
              </span>
              {sessionInfo.draft && (
                <Badge variant="outline" className="text-[10px] ml-1">
                  Draft
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-mono">
                {sessionInfo.providerId ?? "—"}
              </span>
              {sessionInfo.modelName && (
                <>
                  <span>/</span>
                  <span>{sessionInfo.modelName}</span>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Model:</span>
              <select
                value={seat.modelName ?? sessionInfo?.modelName ?? ""}
                onChange={(e) => onUpdateModel?.(seat.id, e.target.value)}
                className="rounded border border-border bg-background px-1 py-0.5 text-xs"
              >
                <option value="">Select model...</option>
                <option value="gpt-5.5">GPT-5.5</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-sonnet">Claude Sonnet</option>
                <option value="claude-opus">Claude Opus</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{sessionInfo.messageCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {sessionInfo.updatedAt
                    ? new Date(sessionInfo.updatedAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {!sessionInfo && canOpen && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Provider:</span>
            <span className="text-sm">{seat.providerId ?? "Not assigned"}</span>
          </div>
        )}

        {assignedTask && (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <span className="text-xs font-medium">Assigned Task</span>
            <span className="text-sm truncate">{assignedTask.title}</span>
            <Badge variant="secondary" className="text-[10px] w-fit">
              {assignedTask.status}
            </Badge>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {!canOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCreateSession?.();
              }}
              className="w-full"
            >
              <Link className="mr-2 h-3 w-3" />
              Create Session
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSession?.();
                }}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open Session
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnbindSession?.();
                }}
                className="w-full text-muted-foreground"
              >
                <Unlink className="mr-2 h-3 w-3" />
                Unlink
              </Button>
            </>
          )}
        </div>

        <div className="pt-2">
          <span className="text-xs text-muted-foreground">Last Update:</span>
          <p className="text-xs">
            {seat.lastUpdate ? new Date(seat.lastUpdate).toLocaleString() : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
