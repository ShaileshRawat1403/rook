# Outcomes Baseline Display v0.1

## Purpose

This document is the scope lock for the **first UI consumer of the outcomes layer**: a compact baseline display at module-selection time. It opens Step 8 of `WORKFLOW_OUTCOMES_V0_1.md` (the explicit UI gate) and is the only outcomes-UI work in scope until v0.2.

Read in order: `OPERATING_MODEL_V0_1.md` → `WORKFLOW_OUTCOMES_V0_1.md` → this doc.

## Why this surface, why now

The operating model's Step 3 (Module Selection) surface contract says the user must see *"prior outcome stats for this module version (success rate, avg time-to-verified, common exception classes)"*. With Step 7 of the outcomes layer green, `getModuleBaseline(moduleId, moduleVersion)` returns those stats. Displaying them at module selection is the smallest UI surface that converts measurement into a decision the user actually makes.

Anything else — Activity panel rollups, Sentinel decision history, trend charts — is deferred.

## Operating rules (binding for v0.1)

1. **One surface only.** Module-selection panel. No new routes, no new menus.
2. **Read-only.** Display, no editing, no drill-down, no charts. Numbers and short labels.
3. **Empty state is explicit.** When a module has zero runs, the panel says "No runs yet" — not zeros (which look like failures).
4. **Async, non-blocking.** Module selection must not wait for baselines to render. Show a skeleton on first load; fail silently to "No data" on errors.
5. **Versions are pinned.** Baseline is for the specific `moduleId@version` the recipe declares. Different versions of the same module show separate baselines.
6. **No design system net new.** Use existing shadcn primitives (Card, Badge, Skeleton). Match the visual weight of the surrounding selector — this is informational, not promotional.

## Where this lives

Module selection in this codebase is `SwarmRecipeSelector` (path: `ui/rook/src/features/colony/swarm/SwarmRecipeSelector.tsx`). The baseline panel attaches per recipe row or appears inline beneath the recipe's existing summary — whichever fits the current visual without a redesign.

A standalone component owns the data fetch and rendering so the selector itself stays simple.

## What's visible (surface contract)

For each candidate module, the user sees:

```
Run history (5)                       ← header with total
┌─────────────────────────────────────────────────────┐
│ 40% reviewer-approved · 10.6 s median               │ ← headline
│ Most common: evidence_exception (4 of 5 runs)       │ ← top concern
└─────────────────────────────────────────────────────┘
```

Required data points (mapped to `ModuleBaseline` fields):

| Element | Source | Empty/Null behavior |
|---|---|---|
| Total runs | `total` | If 0: render "No runs yet" pill; hide the rest |
| Reviewer approval rate | `reviewerApprovalRate` | "—" if `total === 0` |
| Median duration | `medianDurationMs` | "—" if null |
| Top exception class | `exceptionRunsByClass` max | "No exceptions logged" if empty |

**What is NOT visible in v0.1:**

- Average duration (median is more meaningful at small N)
- End-state distribution beyond the approval-rate headline
- Per-intervention counts
- Trend over time
- Per-run links
- Sparklines / bar charts / any graphical visualization

These are v0.2 candidates. Don't add them in this slice.

## States the panel must handle

| State | Trigger | Visual |
|---|---|---|
| Loading | `getModuleBaseline` in flight | Skeleton (one line, ~3 chars wide) |
| Empty | `total === 0` | "No runs yet" pill, no stats |
| Populated | `total > 0` | Headline + top concern lines |
| Error | `getModuleBaseline` rejects | "Baseline unavailable" muted text — silent failure, no toast |

## Implementation plan

Two files, one test, one integration point. No new dependencies.

### Files

```
ui/rook/src/features/workflow-outcomes/ui/
├── ModuleBaselineCard.tsx        # new — pure presentation
└── useModuleBaseline.ts          # new — fetch hook with state machine
```

### Hook contract

```ts
type ModuleBaselineState =
  | { status: "loading" }
  | { status: "empty"; baseline: ModuleBaseline }
  | { status: "ready"; baseline: ModuleBaseline }
  | { status: "error" };

function useModuleBaseline(
  moduleId: string,
  moduleVersion: string,
): ModuleBaselineState;
```

- Fetches via `getModuleBaseline` on mount.
- Caches per `moduleId@version` in module-level state to avoid refetch when toggling between recipes.
- Re-fetches on `moduleId@version` change.
- Does **not** poll. When the recorder successfully writes a new outcome, it invalidates the matching `moduleId@version` cache key so the next mount re-fetches updated stats. No background refresh loop is introduced.

### Component contract

```tsx
<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />
```

- Internally calls `useModuleBaseline`.
- Renders per the state table above.
- No props beyond `moduleId` and `moduleVersion`.
- No callbacks, no children.

### Integration

`SwarmRecipeSelector` renders `<ModuleBaselineCard>` once per recipe alongside the existing recipe summary. If a recipe has no `recipeVersion`, the card is **not rendered** at all (no module-backed runs are possible without a version pin).

### Tests

`ModuleBaselineCard.test.tsx` covers four scenarios:

1. Loading → renders skeleton.
2. Empty (`total === 0`) → renders "No runs yet".
3. Populated → renders headline using fixture data matching the Step 6 five-run aggregate.
4. Error → renders muted "Baseline unavailable" text.

`useModuleBaseline` is mocked at the test boundary; the component test is presentational. No new Tauri mocking required.

## Acceptance criteria

- [ ] `ModuleBaselineCard.tsx` and `useModuleBaseline.ts` exist and compile.
- [ ] `SwarmRecipeSelector` renders the card per recipe with a `recipeVersion`.
- [ ] Empty state shows "No runs yet" and hides the stats lines.
- [ ] Populated state shows total, reviewer-approval rate, median duration, top exception.
- [ ] Error state is silent (no toast, no console error beyond the existing source-event warn).
- [ ] No new npm dependency added.
- [ ] No changes to classifier taxonomy or telemetry schema. The UI consumes derived baseline exports only.
- [ ] Component test covers all four states.

## Out of scope (do not add in this slice)

- Activity panel updates / per-run drill-down.
- Sentinel decision history panel.
- Trend charts, sparklines, or any visualization library.
- Polling / live updates after a run completes.
- Module fork / version-bump UI.
- Cross-module comparison.
- Filtering / sorting modules by baseline stats.
- A "details" modal expanding the baseline.
- Risk-tier indicator (separate v0.2 surface).
- "Recommended" badges on modules.

## Open questions (deferred to v0.2)

1. **Densest layout.** If a future selector lists many modules, the inline card may feel heavy. Defer condensed/popover variants until that pressure exists.
2. **Color coding.** Should low reviewer-approval rates render in a warning color? Risk of falsely flagging modules that have few runs. Skip for v0.1; revisit when sample sizes are larger.

## Resolved after initial ship

1. **Refresh trigger.** v0.1.1 hardening resolved this without polling: after a successful recorder write, the matching baseline cache entry is invalidated, so the next mount fetches fresh stats. The card remains read-only and non-blocking.
2. **Top concern denominator.** The card renders run prevalence (`exceptionRunsByClass`), not raw instance counts (`exceptionsByClass`), so `"X of N runs"` remains truthful even when one run logs the same exception class more than once.

## Changelog

- **v0.1 (2026-05-16):** Initial scope lock for the outcomes baseline display. One surface (`SwarmRecipeSelector`), read-only, four states (loading/empty/ready/error), four data points (total / reviewer-approval rate / median duration / top exception). No charts, no polling, no drill-down. Opens Step 8 of `WORKFLOW_OUTCOMES_V0_1.md`.
- **v0.1.1 (2026-05-16):** Synced the scope lock to shipped hardening: top concern uses per-run prevalence, and successful recorder writes invalidate the matching cache key so the next mount reads fresh stats without polling.
