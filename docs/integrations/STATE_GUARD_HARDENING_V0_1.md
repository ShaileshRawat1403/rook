# State Guard Hardening v0.1

## Purpose

Harden workflow transition guards so review, trust, and readiness states cannot contradict each other.

This slice is the first implementation follow-through from `WORKFLOW_STATE_MODEL_V0_1.md`:

```text
Rook is already stateful.
Rook is not yet state-explicit.
```

The live `sow-builder@1.0.0` pass exposed three guard gaps:

1. output could be approved before reviewable output existed;
2. trust could become `verified` while the output contract was still unsatisfied;
3. required sections could pass from prose mentions rather than headings.

## Product rule

```text
Make transitions honest.
```

Review approval and review readiness are related, but not identical:

```text
reviewable output
  = required artifact present
  + required sections present
  + evidence satisfied
  + required tasks complete

approved output
  = human reviewer accepted reviewable output
```

`ready` cannot be used as the approval guard because the current readiness model includes reviewer satisfaction. Requiring `ready` before approval would create a circular dependency.

## In scope

1. Add a reviewability helper separate from readiness.
2. Block output approval until output is reviewable.
3. Keep request-changes available for incomplete drafts, but not for empty output.
4. Require output-contract satisfaction before trust can become `verified`.
5. Detect required sections from headings rather than prose mentions.
6. Add regression coverage for the live SOW findings.

## Out of scope

1. `runAttemptId`
2. Discovery Brief
3. artifact lifecycle modeling
4. Work Item lifecycle modeling
5. Workflow Module lifecycle modeling
6. DAX trust integration
7. UI redesign

## Transition rules

### Approve output

Allowed only when:

```text
required artifact present
required sections present
required evidence satisfied
required tasks complete
```

### Request changes

Allowed when:

```text
at least one artifact exists
```

This keeps a reviewer able to reject a weak draft while preventing review actions on nothing.

### Verified trust

Allowed only when:

```text
no blocking policy exception
no other exception
output contract satisfied
reviewer approved
evidence satisfied
```

## Acceptance criteria

1. Mark Output Reviewed is blocked until output is reviewable.
2. Request Changes is blocked when no artifact exists.
3. Request Changes remains allowed for incomplete draft artifacts.
4. Trust posture cannot be `verified` unless `outputContractSatisfied` is true.
5. Required sections are detected from headings, not prose mentions.
6. Existing SOW Builder flow still succeeds once a proper SOW artifact exists.
7. Tests cover the three issues found in live usage.
