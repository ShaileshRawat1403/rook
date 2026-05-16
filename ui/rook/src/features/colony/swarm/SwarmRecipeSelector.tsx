import { useState, useEffect } from "react";
import { cn } from "@/shared/lib/cn";
import {
  IconChevronDown,
  IconCopy,
  IconCheck,
  IconGripVertical,
  IconUser,
  IconBooks,
  IconFileText,
  IconSearch,
  IconRocket,
  IconPlus,
  IconArrowRight,
} from "@tabler/icons-react";
import { SWARM_RECIPES, getSwarmRecipe } from "./recipes";
import type { SwarmRecipe, SwarmPlan } from "./types";
import { ModuleBaselineCard } from "@/features/workflow-outcomes/ui/ModuleBaselineCard";

const RICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "repo-review": IconSearch,
  "prd-builder": IconFileText,
  "seo-strategy": IconSearch,
  "release-readiness": IconRocket,
  "docs-audit": IconBooks,
};

interface SwarmRecipeSelectorProps {
  onSelectRecipe: (recipe: SwarmRecipe) => void;
}

export function SwarmRecipeSelector({
  onSelectRecipe,
}: SwarmRecipeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? getSwarmRecipe(selectedId) : null;

  const handleSelect = (recipeId: string) => {
    const recipe = getSwarmRecipe(recipeId);
    if (recipe) {
      setSelectedId(recipeId);
      onSelectRecipe(recipe);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          selected ? "border-primary" : "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              {(() => {
                const Icon = RICONS[selected.id] || IconFileText;
                return <Icon className="size-4" />;
              })()}
              {selected.name}
            </>
          ) : (
            <span>Select a recipe</span>
          )}
        </span>
        <IconChevronDown
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md">
          {SWARM_RECIPES.map((recipe) => {
            const Icon = RICONS[recipe.id] || IconFileText;
            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleSelect(recipe.id)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  selectedId === recipe.id && "bg-accent",
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div className="flex flex-1 flex-col items-start">
                  <span>{recipe.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {recipe.purpose}
                  </span>
                  {recipe.version ? (
                    <ModuleBaselineCard
                      moduleId={recipe.id}
                      moduleVersion={recipe.version}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SwarmAssignmentCardProps {
  assignment: SwarmPlan["assignments"][0];
  onToggle: () => void;
  onCopyPrompt: () => void;
  onEditPrompt: (newPrompt: string) => void;
  onCreateTask?: () => void;
  onPrepareHandoff?: () => void;
  disabled?: boolean;
}

export function SwarmAssignmentCard({
  assignment,
  onToggle,
  onCopyPrompt,
  onEditPrompt,
  onCreateTask,
  onPrepareHandoff,
  disabled = false,
}: SwarmAssignmentCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(assignment.taskPrompt);

  useEffect(() => {
    setEditPrompt(assignment.taskPrompt);
  }, [assignment.taskPrompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assignment.taskPrompt);
      setCopied(true);
      onCopyPrompt();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard failure - silently fail
      onCopyPrompt();
    }
  };

  const handleSaveEdit = () => {
    onEditPrompt(editPrompt);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-md border p-3",
        assignment.enabled
          ? "border-border bg-background"
          : "border-border/50 bg-muted/30 opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconGripVertical className="size-4 cursor-grab text-muted-foreground" />
          <IconUser className="size-4" />
          <span className="font-medium">{assignment.role}</span>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={assignment.enabled}
            onChange={onToggle}
            disabled={disabled}
            className="rounded border-border"
          />
          <span className="text-muted-foreground">Included</span>
        </label>
      </div>

      {isEditing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            rows={6}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded border border-border px-2 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
            {assignment.taskPrompt}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!assignment.enabled}
              className={cn(
                "flex items-center gap-1 rounded border border-border px-2 py-1 text-xs",
                "hover:bg-accent",
                !assignment.enabled && "opacity-50",
              )}
            >
              {copied ? (
                <IconCheck className="size-3" />
              ) : (
                <IconCopy className="size-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={!assignment.enabled || disabled}
              className={cn(
                "rounded border border-border px-2 py-1 text-xs hover:bg-accent",
                (!assignment.enabled || disabled) && "opacity-50",
              )}
            >
              Edit
            </button>
            {onCreateTask && (
              <button
                type="button"
                onClick={onCreateTask}
                disabled={!assignment.enabled}
                className={cn(
                  "flex items-center gap-1 rounded border border-border px-2 py-1 text-xs",
                  "hover:bg-accent",
                  !assignment.enabled && "opacity-50",
                )}
              >
                <IconPlus className="size-3" />
                Task
              </button>
            )}
            {onPrepareHandoff && (
              <button
                type="button"
                onClick={onPrepareHandoff}
                disabled={!assignment.enabled}
                className={cn(
                  "flex items-center gap-1 rounded border border-border px-2 py-1 text-xs",
                  "hover:bg-accent",
                  !assignment.enabled && "opacity-50",
                )}
              >
                <IconArrowRight className="size-3" />
                Prepare Handoff
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SwarmPlanPreviewProps {
  plan: SwarmPlan;
  onToggleAssignment: (assignmentId: string, enabled: boolean) => void;
  onUpdatePrompt: (assignmentId: string, newPrompt: string) => void;
  onCopyPrompt: (assignmentId: string) => void;
  onApprove: () => void;
  onMarkCopied: () => void;
  onCreateTask?: (assignmentId: string, role: string, prompt: string) => void;
  onPrepareHandoff?: (assignmentId: string, role: string, prompt: string) => void;
}

export function SwarmPlanPreview({
  plan,
  onToggleAssignment,
  onUpdatePrompt,
  onCopyPrompt,
  onApprove,
  onMarkCopied,
  onCreateTask,
  onPrepareHandoff,
}: SwarmPlanPreviewProps) {
  const handleToggle = (assignmentId: string, currentEnabled: boolean) => {
    onToggleAssignment(assignmentId, !currentEnabled);
  };

  const isEditable = plan.editable && plan.status === "draft";
  const isApproved = plan.status === "approved";
  const isCopied = plan.status === "prompts_copied";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Swarm Work Items</h3>
          <p className="text-xs text-muted-foreground">{plan.userIntent}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              plan.status === "draft" && "bg-yellow-500/20 text-yellow-500",
              plan.status === "approved" && "bg-green-500/20 text-green-500",
              plan.status === "prompts_copied" &&
                "bg-blue-500/20 text-blue-500",
            )}
          >
            {plan.status}
          </span>
        </div>
      </div>

      {plan.changesFromRecipe.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <p className="mb-2 text-xs font-medium">Changes from recipe</p>
          <ul className="space-y-1">
            {plan.changesFromRecipe.map((change, index) => {
              const isPromptChange = change.field === "taskPrompt";
              const label = isPromptChange
                ? `${change.field.split(".")[0]} prompt edited`
                : change.field;
              const value = isPromptChange
                ? "prompt modified"
                : `${change.previousValue || "(none)"} → ${change.newValue}`;
              return (
                <li
                  key={`${change.field}-${index}`}
                  className="text-xs text-muted-foreground"
                >
                  <span className="font-medium">{label}</span>: {value}
                  <span className="text-muted"> ({change.reason})</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {[...plan.assignments]
          .sort((a, b) => a.order - b.order)
          .map((assignment) => (
            <SwarmAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onToggle={() => handleToggle(assignment.id, assignment.enabled)}
              onCopyPrompt={() => onCopyPrompt(assignment.id)}
              onEditPrompt={(newPrompt) =>
                onUpdatePrompt(assignment.id, newPrompt)
              }
              onCreateTask={
                onCreateTask
                  ? () => onCreateTask(assignment.id, assignment.role, assignment.taskPrompt)
                  : undefined
              }
              onPrepareHandoff={
                onPrepareHandoff
                  ? () => onPrepareHandoff(assignment.id, assignment.role, assignment.taskPrompt)
                  : undefined
              }
              disabled={!isEditable}
            />
          ))}
      </div>

      {isEditable && (
        <button
          type="button"
          onClick={onApprove}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Approve Plan
        </button>
      )}

      {isApproved && !isCopied && (
        <button
          type="button"
          onClick={onMarkCopied}
          className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Mark Prompts Copied
        </button>
      )}

      {isCopied && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-500">
          <p className="font-medium">Prompts copied.</p>
          <p className="mt-1 text-xs">
            No handoff was created automatically. Use the Handoffs panel
            when you are ready to move context.
          </p>
        </div>
      )}
    </div>
  );
}
