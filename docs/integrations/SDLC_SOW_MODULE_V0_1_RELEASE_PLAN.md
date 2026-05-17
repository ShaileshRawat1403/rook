# SDLC SOW Module v0.1 Release Plan

## Release candidate

```text
sow-builder@1.0.0
```

## Goal

Ship Agile SOW Builder as a release-ready workflow module with:

- a stable recipe definition
- Colony creation support
- output-readiness support
- tests that prove the module is wired end to end
- a documented release path

## Ship criteria

### Product

- [ ] User can create an Agile SOW Builder Colony from a Work Item.
- [ ] The resulting Colony shows:
  - Business Analyst
  - Developer
  - Project Manager
- [ ] Output contract shows `sow`.
- [ ] Required SOW sections are visible through the existing output-readiness surface.
- [ ] Reviewer approval and evidence remain required.

### Engineering

- [ ] Affected Colony tests pass.
- [ ] UI typecheck passes.
- [ ] Changed files are formatted and lint-clean.
- [ ] No generated files are edited manually.
- [ ] Branch remains clean after verification.

### Governance

- [ ] `SDLC_SOW_MODULE_V0_1_SCOPE_LOCK.md` is present.
- [ ] Module stays within the Colony / SDLC Verification boundary.
- [ ] Any later module improvement ships as a new module version, never as an in-place mutation of historical behavior.

## Verification commands

Run from repo root:

```bash
pnpm -C ui/rook test --run \
  src/features/colony/ColonyRecipeEntry.test.tsx \
  src/features/colony/outputReadiness.test.ts \
  src/features/colony/swarm/recipes.test.ts

pnpm -C ui/rook run typecheck

pnpm -C ui/rook biome check \
  src/features/colony/ColonyRecipeEntry.tsx \
  src/features/colony/ColonyRecipeEntry.test.tsx \
  src/features/colony/outputReadiness.ts \
  src/features/colony/outputReadiness.test.ts \
  src/features/colony/swarm/SwarmRecipeSelector.tsx \
  src/features/colony/swarm/recipes.ts \
  src/features/colony/swarm/recipes.test.ts \
  src/features/colony/swarm/types.ts \
  src/features/colony/types.ts
```

## Current verification status

Verified on `feat/sdlc-sow-module`:

- [x] affected Colony + swarm tests: 107/107 passed
- [x] UI typecheck passed
- [x] repository-wide UI check passed
- [x] full UI test suite passed: 682/682
- [x] UI production build passed

## Manual QA

1. Open the Colony creation surface from a Work Item.
2. Select **Agile SOW Builder**.
3. Confirm the preview shows:
   - output `sow`
   - three seats
   - the Work Item’s acceptance-criteria count
4. Create the Colony.
5. Confirm:
   - Work Item remains attached
   - seats are Business Analyst / Developer / Project Manager
   - Outputs tab shows the SOW contract
6. Add a document artifact containing the required headings and confirm readiness moves forward.
7. Mark the output reviewed and confirm reviewer readiness is satisfied.

## Release path

### If this goes into the next normal release

1. Merge the feature branch into `main`.
2. Let the scheduled/manual minor-release automation create the version-bump PR.
3. Merge that PR.
4. Validate the generated `release/<version>` branch and release PR.
5. Run the normal manual release checklist from `RELEASE_CHECKLIST.md`.
6. Tag `v<version>` from the release branch when QA is complete.

### If a release branch already exists

1. Cherry-pick the final SOW module commit(s) into that release branch only if product explicitly wants this module in that release.
2. Re-run the verification commands above on the release branch.
3. Complete the release PR checklist before tagging.

## Known baseline notes

- The repository-wide `pnpm -C ui/rook run check` passes on this branch.
- A small adjacent cleanup pass landed with the module work to keep the UI baseline honest: Colony a11y fixes, stable Swarm change IDs, ACP usage buffering hardening, and updated file-size exceptions for still-large transitional Colony surfaces.
