import { ArrowRight, Copy, Trash2 } from "lucide-react";
import type { ColonyHandoff, ColonyRole } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";

const STATUS_LABELS: Record<ColonyHandoff["status"], string> = {
  draft: "Draft",
  ready: "Ready",
  copied: "Copied",
};

const STATUS_COLORS: Record<ColonyHandoff["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500 text-white",
  copied: "bg-green-500 text-white",
};

interface ColonyHandoffPanelProps {
  handoffs: ColonyHandoff[];
  seats: { id: string; role: ColonyRole; label: string }[];
  tasks: { id: string; title: string }[];
  onCreateHandoff: (
    fromSeatId: string,
    toSeatId: string,
    taskId?: string,
    summary?: string,
  ) => void;
  onMarkCopied: (handoffId: string) => void;
  onDeleteHandoff: (handoffId: string) => void;
}

export function ColonyHandoffPanel({
  handoffs,
  seats,
  tasks,
  onCreateHandoff,
  onMarkCopied,
  onDeleteHandoff,
}: ColonyHandoffPanelProps) {
  const getSeatLabel = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    return seat?.label ?? "Unknown";
  };

  const getTaskTitle = (taskId: string | undefined) => {
    if (!taskId) return null;
    const task = tasks.find((t) => t.id === taskId);
    return task?.title ?? null;
  };

  const generateHandoffPrompt = (handoff: ColonyHandoff) => {
    const fromLabel = getSeatLabel(handoff.fromSeatId);
    const toLabel = getSeatLabel(handoff.toSeatId);
    const taskTitle = getTaskTitle(handoff.taskId);

    return `You are the ${toLabel} seat in Rook Colony.

Context from ${fromLabel}${taskTitle ? `\nTask: ${taskTitle}` : ""}

${handoff.summary.trim()}

Use this context to continue the work.
Do not add scope beyond the assigned task.`;
  };

  const handleCopy = (handoff: ColonyHandoff) => {
    const prompt = generateHandoffPrompt(handoff);
    navigator.clipboard.writeText(prompt);
    onMarkCopied(handoff.id);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Handoffs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Transfer task context between seats. No automatic execution.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fromSeatId = (
              form.elements.namedItem("fromSeatId") as HTMLSelectElement
            ).value;
            const toSeatId = (form.elements.namedItem("toSeatId") as HTMLSelectElement)
              .value;
            const taskId = (form.elements.namedItem("taskId") as HTMLSelectElement)
              .value;
            const summary = (
              form.elements.namedItem("summary") as HTMLInputElement
            ).value;
            if (fromSeatId && toSeatId) {
              onCreateHandoff(
                fromSeatId,
                toSeatId,
                taskId || undefined,
                summary || undefined,
              );
              (form.elements.namedItem("summary") as HTMLInputElement).value = "";
            }
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <select
              name="fromSeatId"
              required
              className="rounded border border-border bg-background px-2 py-1 text-xs flex-1"
              defaultValue=""
            >
              <option value="" disabled>
                From seat...
              </option>
              {seats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.label}
                </option>
              ))}
            </select>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-none mt-1" />
            <select
              name="toSeatId"
              required
              className="rounded border border-border bg-background px-2 py-1 text-xs flex-1"
              defaultValue=""
            >
              <option value="" disabled>
                To seat...
              </option>
              {seats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.label}
                </option>
              ))}
            </select>
          </div>
          <select
            name="taskId"
            className="rounded border border-border bg-background px-2 py-1 text-xs"
            defaultValue=""
          >
            <option value="">No task linked...</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <Input name="summary" placeholder="Summary of context to transfer..." />
          <Button type="submit" size="sm" className="w-full">
            Create Handoff
          </Button>
        </form>

        {handoffs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No handoffs yet. Create one to transfer context between seats.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {handoffs.map((handoff) => (
              <div
                key={handoff.id}
                className="flex flex-col gap-1 rounded-md border border-border p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {getSeatLabel(handoff.fromSeatId)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {getSeatLabel(handoff.toSeatId)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ml-auto ${STATUS_COLORS[handoff.status]}`}
                  >
                    {STATUS_LABELS[handoff.status]}
                  </Badge>
                </div>
                {handoff.taskId && (
                  <p className="text-xs text-muted-foreground">
                    Task: {getTaskTitle(handoff.taskId)}
                  </p>
                )}
                {handoff.summary && (
                  <p className="text-xs line-clamp-2">{handoff.summary}</p>
                )}
                <div className="flex gap-1 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(handoff)}
                    className="flex-1"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy Prompt
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteHandoff(handoff.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}