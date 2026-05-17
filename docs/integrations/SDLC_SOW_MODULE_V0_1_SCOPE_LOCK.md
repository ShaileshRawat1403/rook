# SDLC SOW Module v0.1 Scope Lock

## Status

Locked for implementation and release preparation.

## Context

Rook already treats workflow modules as reusable, versioned methods:

- Work Items define the subject of the run.
- Modules define the method.
- Colonies compile the module into seats, tasks, handoffs, and an output contract.
- Outcomes are recorded against `moduleId@version`.

The existing validated Colony entry point exposes:

- Repo Review
- Release Readiness
- Documentation Audit

This slice adds one more validated module without changing Colony governance semantics.

---

## I-1. Intent

`sow-builder@1.0.0` turns a scoped initiative into a governed Agile Statement of Work.

It exists for work that needs:

- explicit business framing
- implementation shape
- delivery sequencing
- a reviewable final SOW artifact

The module should make complex project initiation easier to coordinate without pretending to execute delivery itself.

---

## I-2. Inform

The module needs three distinct contributions:

1. Business Analyst
   - define the problem, objectives, scope, acceptance criteria, assumptions
2. Developer
   - shape the implementation approach, slices, dependencies, verification
3. Project Manager
   - turn the prior outputs into the final governed SOW

The final artifact is a `sow`, which is document-like and must fit the existing Colony output-readiness model.

---

## I-3. Interpret

### Locked decisions

1. **This is a new module, not a new Colony architecture slice.**
   - No change to seat generation, lifecycle, review semantics, or readiness philosophy.

2. **The module remains low-risk and advisory.**
   - It plans work.
   - It does not execute implementation, approve stakeholders, or alter external systems.

3. **The final artifact is a first-class `sow`.**
   - `sow` is added to the artifact contract union.
   - Readiness accepts existing Colony artifact kinds compatible with document-like outputs.

4. **The final SOW must stay governed.**
   - Reviewer approval remains required.
   - Evidence remains required.
   - Change control is part of the final contract.

5. **The module is immutable once released.**
   - Improvements create `sow-builder@1.0.1` or later.
   - Historical runs stay pinned to `sow-builder@1.0.0`.

---

## I-4. Initiate

### In scope

```text
1. Add `sow-builder@1.0.0` to the swarm recipe catalog.
2. Expose it in validated Work Item → Colony creation.
3. Surface it in the module selector.
4. Add `sow` to module and Colony artifact-type contracts.
5. Teach Colony output readiness which artifact kinds satisfy a SOW.
6. Add tests for recipe registration, Colony creation, prompt coverage, and readiness support.
```

### Out of scope

```text
- automatic project planning
- automatic SOW generation outside user-controlled runs
- stakeholder approval workflows
- external document export
- pricing, budgeting, staffing, or legal templates
- automatic verification from Colony close
```

---

## Acceptance criteria

- [ ] `sow-builder@1.0.0` is present in the swarm module catalog.
- [ ] The validated Colony entry point exposes Agile SOW Builder.
- [ ] Creating a Colony from the module preserves Work Item linkage.
- [ ] The created Colony carries a `sow` output contract.
- [ ] The created Colony has Business Analyst, Developer, and Project Manager seats.
- [ ] SOW readiness recognizes document-compatible artifacts.
- [ ] Specialist prompts all require evidence and uncertainty.
- [ ] The final SOW contract requires:
  - Purpose
  - Scope
  - Delivery roles
  - Sprint plan
  - Deliverables
  - Acceptance criteria
  - Change control
- [ ] No Colony or SDLC Verification boundary is changed by this slice.

---

## Release note

This slice adds a reusable planning module. It should ship as part of the next normal feature release unless a release branch is already cut and product wants it cherry-picked deliberately.
