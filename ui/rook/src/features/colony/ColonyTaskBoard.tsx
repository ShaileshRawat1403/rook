import { Plus, Trash2, User } from "lucide-react";
import type { ColonyTask, ColonyRole } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";

const STATUS_LABELS: Record<ColonyTask["status"], string> = {
  todo: "To Do",
  assigned: "Assigned",
  inProgress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_COLORS: Record<ColonyTask["status"], string> = {
  todo: "bg-muted text-muted-foreground",
  assigned: "bg-blue-500 text-white",
  inProgress: "bg-yellow-500 text-white",
  blocked: "bg-red-500 text-white",
  done: "bg-green-500 text-white",
};

interface ColonyTaskBoardProps {
  tasks: ColonyTask[];
  seats: { id: string; role: ColonyRole; label: string }[];
  onCreateTask: (title: string, description?: string) => void;
  onAssignTask: (taskId: string, seatId: string | null) => void;
  onUpdateStatus: (taskId: string, status: ColonyTask["status"]) => void;
  onDeleteTask: (taskId: string) => void;
}

export function ColonyTaskBoard({
  tasks,
  seats,
  onCreateTask,
  onAssignTask,
  onUpdateStatus,
  onDeleteTask,
}: ColonyTaskBoardProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("title") as HTMLInputElement;
    const title = input.value.trim();
    if (!title) return;
    onCreateTask(title);
    input.value = "";
  };

  const getSeatLabel = (seatId: string | undefined) => {
    if (!seatId) return null;
    const seat = seats.find((s) => s.id === seatId);
    return seat?.label ?? null;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            name="title"
            placeholder="New task title..."
            className="flex-1"
          />
          <Button type="submit" size="sm">
            <Plus className="h-3 w-3" />
          </Button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No tasks yet. Create one to start coordinating.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-md border border-border p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${STATUS_COLORS[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </p>
                  )}
                  {task.assignedSeatId && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{getSeatLabel(task.assignedSeatId)}</span>
                    </div>
                  )}
                </div>

                <select
                  value={task.assignedSeatId ?? ""}
                  onChange={(e) =>
                    onAssignTask(task.id, e.target.value || null)
                  }
                  className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                >
                  <option value="">Assign...</option>
                  {seats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.label}
                    </option>
                  ))}
                </select>

                <select
                  value={task.status}
                  onChange={(e) =>
                    onUpdateStatus(
                      task.id,
                      e.target.value as ColonyTask["status"],
                    )
                  }
                  className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                >
                  <option value="todo">To Do</option>
                  <option value="assigned">Assigned</option>
                  <option value="inProgress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTask(task.id)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}