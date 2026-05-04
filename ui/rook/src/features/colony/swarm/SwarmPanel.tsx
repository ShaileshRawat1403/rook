import { useState } from "react";
import { useSwarmStore } from "./swarmStore";
import { SwarmRecipeSelector, SwarmPlanPreview } from "./SwarmRecipeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function SwarmPanel({
  onCreateTask,
  onPrepareHandoff,
}: {
  onCreateTask?: (title: string, description?: string) => void;
  onPrepareHandoff?: (workItemId: string, role: string, prompt: string) => void;
}) {
  const {
    selectedRecipe,
    currentPlan,
    error,
    selectRecipe,
    generatePlan,
    toggleAssignment,
    updatePrompt,
    approve,
    markCopied,
    clearError,
  } = useSwarmStore();

  useSwarmStore.getState().setCreateTaskHandler(() => onCreateTask);
  useSwarmStore.getState().setPrepareHandoffHandler(() => onPrepareHandoff);

  const [userIntent, setUserIntent] = useState("");

  const handleSelectRecipe = (recipe: typeof selectedRecipe) => {
    if (recipe) {
      selectRecipe(recipe);
    }
  };

  const handleGenerate = () => {
    if (userIntent.trim()) {
      generatePlan(userIntent.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swarm Work Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-2">
            <p className="text-xs text-danger">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-danger underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!currentPlan ? (
          <>
            <SwarmRecipeSelector onSelectRecipe={handleSelectRecipe} />
            {selectedRecipe && (
              <div className="space-y-2">
                <textarea
                  value={userIntent}
                  onChange={(e) => setUserIntent(e.target.value)}
                  placeholder="What task do you want to accomplish?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!userIntent.trim()}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Generate Plan
                </button>
              </div>
            )}
          </>
        ) : (
          <SwarmPlanPreview
            plan={currentPlan}
            onToggleAssignment={(id) => toggleAssignment(id)}
            onUpdatePrompt={updatePrompt}
            onCopyPrompt={() => {}}
            onApprove={approve}
            onMarkCopied={markCopied}
            onCreateTask={
              onCreateTask
                ? (id, role, _prompt) => {
                    const assignment = currentPlan.assignments.find((a) => a.id === id);
                    if (assignment) {
                      onCreateTask(`${role}: ${assignment.taskPrompt.slice(0, 50)}`, assignment.taskPrompt);
                    }
                  }
                : undefined
            }
            onPrepareHandoff={
              onPrepareHandoff
                ? (id, role, _prompt) => {
                    const assignment = currentPlan.assignments.find((a) => a.id === id);
                    if (assignment) {
                      onPrepareHandoff(id, role, assignment.taskPrompt);
                    }
                  }
                : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
