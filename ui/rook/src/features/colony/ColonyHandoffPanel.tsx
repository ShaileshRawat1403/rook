import { ArrowRight, Copy, Trash2, FileText, Check, X } from "lucide-react";
import { useState } from "react";
import type { ColonyHandoff, ColonyRole } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  getContextLoad,
  CONTEXT_LOAD_LABELS,
  CONTEXT_LOAD_CLASSES,
} from "./contextBudget";

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

interface HandoffTemplate {
  name: string;
  fromRole: ColonyRole;
  toRole: ColonyRole;
  fields: {
    goal: string;
    decisionMade: string;
    constraints: string;
    filesInvolved: string;
    nextAction: string;
    whatNotToChange: string;
  };
}

const HANDOFF_TEMPLATES: HandoffTemplate[] = [
  {
    name: "Planner → Worker",
    fromRole: "planner",
    toRole: "worker",
    fields: {
      goal: "What should this work accomplish?",
      decisionMade: "What decision was made?",
      constraints: "What are the constraints or requirements?",
      filesInvolved: "Files or areas to work on:",
      nextAction: "What should Worker do next:",
      whatNotToChange: "What not to change or touch:",
    },
  },
  {
    name: "Worker → Reviewer",
    fromRole: "worker",
    toRole: "reviewer",
    fields: {
      goal: "What work was completed?",
      decisionMade: "Implementation approach used:",
      constraints: "Limitations or boundaries:",
      filesInvolved: "Files changed:",
      nextAction: "What needs review:",
      whatNotToChange: "Do not modify:",
    },
  },
  {
    name: "Reviewer → Planner",
    fromRole: "reviewer",
    toRole: "planner",
    fields: {
      goal: "What was reviewed?",
      decisionMade: "Review finding:",
      constraints: "Gaps or missing context:",
      filesInvolved: "Files reviewed:",
      nextAction: "Recommended next step:",
      whatNotToChange: "Areas to avoid:",
    },
  },
  {
    name: "Worker → Sentinel",
    fromRole: "worker",
    toRole: "reviewer",
    fields: {
      goal: "Work to validate:",
      decisionMade: "Risk assessment:",
      constraints: "Safety boundaries:",
      filesInvolved: "Files checked:",
      nextAction: "What Sentinel should verify:",
      whatNotToChange: "Do not approve or execute:",
    },
  },
];

interface ColonyHandoffPanelProps {
  handoffs: ColonyHandoff[];
  seats: { id: string; role: ColonyRole; label: string }[];
  tasks: { id: string; title: string }[];
  handoffsByTaskId: Record<string, ColonyHandoff[]>;
  onCreateHandoff: (
    fromSeatId: string,
    toSeatId: string,
    taskId?: string,
    summary?: string,
  ) => void;
  onMarkCopied: (handoffId: string) => void;
  onDeleteHandoff: (handoffId: string) => void;
  onReviewHandoff: (
    handoffId: string,
    reviewStatus: "approved" | "rejected",
    reviewNote?: string,
  ) => void;
}

export function ColonyHandoffPanel({
  handoffs,
  seats,
  tasks,
  handoffsByTaskId,
  onCreateHandoff,
  onMarkCopied,
  onDeleteHandoff,
  onReviewHandoff,
}: ColonyHandoffPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const getSeatLabel = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    return seat?.label ?? "Unknown";
  };

  const getTaskTitle = (taskId: string | undefined) => {
    if (!taskId) return null;
    const task = tasks.find((t) => t.id === taskId);
    return task?.title ?? null;
  };

  const isReviewerHandoff = (handoff: ColonyHandoff) => {
    const toSeat = seats.find((s) => s.id === handoff.toSeatId);
    return toSeat?.role === "reviewer";
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

  const handleCopy = async (handoff: ColonyHandoff) => {
    const prompt = generateHandoffPrompt(handoff);
    try {
      await navigator.clipboard.writeText(prompt);
      onMarkCopied(handoff.id);
    } catch {
      console.error("Failed to copy handoff to clipboard");
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Handoffs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Move selected context between roles. No automatic execution.
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
            let summary = (
              form.elements.namedItem("summary") as HTMLInputElement
            ).value.trim();

            if (!fromSeatId || !toSeatId) return;
            if (fromSeatId === toSeatId) {
              alert("Choose a different receiving seat.");
              return;
            }

            if (selectedTemplate) {
              const template = HANDOFF_TEMPLATES.find((t) => t.name === selectedTemplate);
              if (template && !summary) {
                summary = `Goal: ${template.fields.goal}\n\nDecision Made: ${template.fields.decisionMade}\n\nConstraints: ${template.fields.constraints}\n\nFiles Involved: ${template.fields.filesInvolved}\n\nNext Action: ${template.fields.nextAction}\n\nDo Not Change: ${template.fields.whatNotToChange}`;
              }
            }

            if (!summary) {
              alert("Summary is required.");
              return;
            }

            onCreateHandoff(fromSeatId, toSeatId, taskId || undefined, summary);
            (form.elements.namedItem("summary") as HTMLTextAreaElement).value = "";
            (form.elements.namedItem("fromSeatId") as HTMLSelectElement).value = "";
            (form.elements.namedItem("toSeatId") as HTMLSelectElement).value = "";
            (form.elements.namedItem("taskId") as HTMLSelectElement).value = "";
            setSelectedTemplate("");
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
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs flex-1"
            >
              <option value="">Choose handoff shape...</option>
              {HANDOFF_TEMPLATES.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
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
          <Textarea
            name="summary"
            placeholder="Goal: What should this work accomplish?&#10;Decision Made: What decision was made?&#10;Constraints: What are the constraints?&#10;Files Involved: What files were changed?&#10;Next Action: What should happen next?&#10;Do Not Change: What should stay the same?"
            className="min-h-[120px] resize-none text-xs"
          />
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
                  {(() => {
                    const taskHandoffs = handoff.taskId
                      ? handoffsByTaskId[handoff.taskId] ?? []
                      : [];
                    const load = getContextLoad(handoff, taskHandoffs);
                    return (
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ml-1 ${
                          CONTEXT_LOAD_CLASSES[load]
                        }`}
                      >
                        {CONTEXT_LOAD_LABELS[load]}
                      </Badge>
                    );
                  })()}
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
                {isReviewerHandoff(handoff) && handoff.status === "copied" && (
                  <div className="flex flex-col gap-2 border-t border-border pt-2 mt-1">
                    <span className="text-xs text-muted-foreground">Review:</span>
                    {handoff.reviewStatus ? (
                      <>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] w-fit ${
                            handoff.reviewStatus === "approved"
                              ? "bg-green-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {handoff.reviewStatus === "approved" ? (
                            <>
                              <Check className="mr-1 h-2 w-2" />
                              Approved
                            </>
                          ) : (
                            <>
                              <X className="mr-1 h-2 w-2" />
                              Rejected
                            </>
                          )}
                        </Badge>
                        {handoff.reviewStatus === "rejected" &&
                          handoff.reviewNote && (
                            <p className="text-xs text-muted-foreground">
                              Note: {handoff.reviewNote}
                            </p>
                          )}
                      </>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onReviewHandoff(handoff.id, "approved")
                          }
                          className="h-6 text-xs"
                        >
                          <Check className="mr-1 h-2 w-2" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const note = prompt("Rejection reason (optional):");
                            onReviewHandoff(
                              handoff.id,
                              "rejected",
                              note || undefined,
                            );
                          }}
                          className="h-6 text-xs"
                        >
                          <X className="mr-1 h-2 w-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}