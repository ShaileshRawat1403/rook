import { useEffect, useMemo, useState } from "react";
import { useColonyStore } from "./colonyStore";
import {
  DOCS_AUDIT_RECIPE,
  RELEASE_READINESS_RECIPE,
  REPO_REVIEW_RECIPE,
  SOW_BUILDER_RECIPE,
} from "./swarm/recipes";
import type { SwarmRecipe } from "./swarm/types";
import { useWorkItemStore } from "@/features/work-items/stores/workItemStore";

const VALIDATED_RECIPES: readonly SwarmRecipe[] = [
  REPO_REVIEW_RECIPE,
  RELEASE_READINESS_RECIPE,
  DOCS_AUDIT_RECIPE,
  SOW_BUILDER_RECIPE,
];
const DEFAULT_VALIDATED_RECIPE = REPO_REVIEW_RECIPE;

export function ColonyRecipeEntry() {
  const items = useWorkItemStore((s) => s.items);
  const fetchAll = useWorkItemStore((s) => s.fetchAll);
  const createColonyFromRecipe = useColonyStore(
    (s) => s.createColonyFromRecipe,
  );

  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(
    null,
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    DEFAULT_VALIDATED_RECIPE.id,
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedWorkItemId && items.length > 0) {
      setSelectedWorkItemId(items[0]?.id ?? null);
    }
  }, [items, selectedWorkItemId]);

  const selectedWorkItem = useMemo(
    () => items.find((it) => it.id === selectedWorkItemId) ?? items[0] ?? null,
    [items, selectedWorkItemId],
  );

  const selectedRecipe =
    VALIDATED_RECIPES.find((r) => r.id === selectedRecipeId) ??
    DEFAULT_VALIDATED_RECIPE;

  if (items.length === 0 || !selectedWorkItem) {
    return (
      <section
        aria-label="Create Colony from Work Item"
        className="mt-8 w-full rounded-lg border border-dashed border-border bg-background px-6 py-5 text-left"
      >
        <h3 className="text-sm font-medium">Create Colony from Work Item</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Colony v0.5 starts from a Work Item. Select or create a Work Item
          first, then use Colony to turn its acceptance criteria into role-based
          tasks.
        </p>
      </section>
    );
  }

  const acCount = selectedWorkItem.acceptanceCriteria.length;
  const seatCount = selectedRecipe.specialists.length;
  const requiredSectionCount =
    selectedRecipe.finalArtifact.requiredSections.length;
  const workItemLabel = selectedWorkItem.key
    ? `${selectedWorkItem.key} — ${selectedWorkItem.title}`
    : selectedWorkItem.title;

  const handleCreate = () => {
    createColonyFromRecipe({
      title: `${selectedRecipe.name}: ${selectedWorkItem.title}`,
      intent: selectedRecipe.name,
      workItemId: selectedWorkItem.id,
      recipeId: selectedRecipe.id,
      acceptanceCriteria: selectedWorkItem.acceptanceCriteria,
    });
  };

  return (
    <section
      aria-label="Create Colony from Work Item"
      className="mt-8 w-full rounded-lg border border-border bg-background px-6 py-5 text-left"
    >
      <h3 className="text-sm font-medium">Create Colony from Work Item</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Choose the workflow shape for this Work Item. Rook will create role
        seats, tasks from acceptance criteria, and an output contract.
      </p>

      {items.length > 1 && (
        <label className="mt-4 block text-xs text-muted-foreground">
          Work Item
          <select
            aria-label="Work Item"
            value={selectedWorkItem.id}
            onChange={(e) => setSelectedWorkItemId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.key ? `${it.key} — ` : ""}
                {it.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset
        className="mt-4 flex flex-col gap-2"
        aria-label="Workflow recipe"
      >
        <legend className="text-xs uppercase tracking-wide text-muted-foreground">
          Workflow recipe
        </legend>
        {VALIDATED_RECIPES.map((recipe) => {
          const isSelected = recipe.id === selectedRecipe.id;
          return (
            <label
              key={recipe.id}
              data-recipe-id={recipe.id}
              data-recipe-selected={isSelected ? "true" : "false"}
              className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                isSelected
                  ? "border-foreground bg-muted"
                  : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <input
                type="radio"
                name="colony-recipe"
                value={recipe.id}
                aria-label={recipe.name}
                checked={isSelected}
                onChange={() => setSelectedRecipeId(recipe.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{recipe.name}</div>
                <div className="text-xs text-muted-foreground">
                  {recipe.purpose}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Output: {recipe.finalArtifact.artifactType} ·{" "}
                  {recipe.finalArtifact.requiredSections.length} sections ·{" "}
                  {recipe.specialists.length} seats
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Recipe</dt>
        <dd className="font-medium">{selectedRecipe.name}</dd>
        <dt className="text-muted-foreground">Work Item</dt>
        <dd className="truncate font-medium">{workItemLabel}</dd>
        <dt className="text-muted-foreground">Seats</dt>
        <dd className="font-medium">{seatCount}</dd>
        <dt className="text-muted-foreground">Acceptance Criteria</dt>
        <dd className="font-medium">{acCount}</dd>
        <dt className="text-muted-foreground">Tasks to create</dt>
        <dd className="font-medium">{acCount}</dd>
        <dt className="text-muted-foreground">Expected output</dt>
        <dd className="font-medium">
          {selectedRecipe.finalArtifact.artifactType}
        </dd>
        <dt className="text-muted-foreground">Required sections</dt>
        <dd className="font-medium">{requiredSectionCount}</dd>
      </dl>

      <button
        type="button"
        onClick={handleCreate}
        className="mt-5 w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
      >
        Create Colony
      </button>
    </section>
  );
}
