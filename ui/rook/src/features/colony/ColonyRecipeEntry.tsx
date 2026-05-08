import { useEffect, useMemo, useState } from "react";
import { useColonyStore } from "./colonyStore";
import { REPO_REVIEW_RECIPE } from "./swarm/recipes";
import { useWorkItemStore } from "@/features/work-items/stores/workItemStore";

export function ColonyRecipeEntry() {
  const items = useWorkItemStore((s) => s.items);
  const fetchAll = useWorkItemStore((s) => s.fetchAll);
  const createColonyFromRecipe = useColonyStore(
    (s) => s.createColonyFromRecipe,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  if (items.length === 0 || !selected) {
    return (
      <section
        aria-label="Repo Review Colony"
        className="mt-8 w-full rounded-lg border border-dashed border-border bg-background px-6 py-5 text-left"
      >
        <h3 className="text-sm font-medium">Review a Work Item with Colony</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Colony v0.5 starts from a Work Item. Select or create a Work Item
          first, then use Colony to turn its acceptance criteria into role-based
          tasks.
        </p>
      </section>
    );
  }

  const acCount = selected.acceptanceCriteria.length;
  const seatCount = REPO_REVIEW_RECIPE.specialists.length;
  const workItemLabel = selected.key
    ? `${selected.key} — ${selected.title}`
    : selected.title;

  const handleCreate = () => {
    createColonyFromRecipe({
      title: `Repo Review: ${selected.title}`,
      intent: "Repo Review",
      workItemId: selected.id,
      recipeId: REPO_REVIEW_RECIPE.id,
      acceptanceCriteria: selected.acceptanceCriteria,
    });
  };

  return (
    <section
      aria-label="Repo Review Colony"
      className="mt-8 w-full rounded-lg border border-border bg-background px-6 py-5 text-left"
    >
      <h3 className="text-sm font-medium">Review a Work Item with Colony</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Recipe-driven Colony anchored on a Work Item. No automatic execution.
      </p>

      {items.length > 1 && (
        <label className="mt-4 block text-xs text-muted-foreground">
          Work Item
          <select
            aria-label="Work Item"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
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

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Recipe</dt>
        <dd className="font-medium">{REPO_REVIEW_RECIPE.name}</dd>
        <dt className="text-muted-foreground">Work Item</dt>
        <dd className="truncate font-medium">{workItemLabel}</dd>
        <dt className="text-muted-foreground">Seats</dt>
        <dd className="font-medium">{seatCount}</dd>
        <dt className="text-muted-foreground">Acceptance Criteria</dt>
        <dd className="font-medium">{acCount}</dd>
        <dt className="text-muted-foreground">Tasks to create</dt>
        <dd className="font-medium">{acCount}</dd>
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
