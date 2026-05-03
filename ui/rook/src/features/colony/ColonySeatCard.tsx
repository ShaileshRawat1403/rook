import { Bot, User, Eye } from "lucide-react";
import type { ColonySeat } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

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

interface ColonySeatCardProps {
  seat: ColonySeat;
}

export function ColonySeatCard({ seat }: ColonySeatCardProps) {
  const Icon = ROLE_ICONS[seat.role];
  const roleColor = ROLE_COLORS[seat.role];
  const statusColor = STATUS_COLORS[seat.status];

  return (
    <Card className="flex flex-col">
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
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant="secondary" className={statusColor}>
            {seat.status}
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Current Task:</span>
          <span className="text-sm">
            {seat.currentTask ?? "No task yet"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Provider:</span>
          <span className="text-sm">
            {seat.providerId ?? "Not assigned"}
          </span>
        </div>
        <div className="mt-auto pt-2">
          <span className="text-xs text-muted-foreground">Last Update:</span>
          <p className="text-xs">
            {seat.lastUpdate
              ? new Date(seat.lastUpdate).toLocaleString()
              : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}