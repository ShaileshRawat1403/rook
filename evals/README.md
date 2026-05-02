# Rook Evals System

Deterministic, local eval harness for Rook's core behaviors.

## Quick Start

```bash
# Run all smoke evals
bun run eval:smoke

# Run specific suite
bun run eval:smoke -- core_proof
bun run eval:smoke -- policy

# Update baseline
bun run eval:smoke -- --update-baseline

# Compare against baseline
bun run eval:smoke -- --compare-baseline
```

## Architecture

```text
evals/
├── types.ts              # Scenario, Assertion, Result types
├── scripts/
│   ├── eval.ts          # Main runner
│   └── validate.ts      # Zod schema validation
├── scenarios/           # Test scenarios (JSON)
├── fixtures/            # Input fixtures for scenarios
│   ├── core_proof/
│   ├── policy/
│   └── audit/
└── baselines/          # Baseline snapshots for drift detection
```

## Scenario Format

```json
{
  "name": "policy_deny_destructive",
  "suite": "smoke",
  "kind": "policy",
  "input": "policy/destructive.json",
  "expect": [
    { "path": "decision", "op": "equals", "value": "deny" },
    { "path": "risk", "op": "equals", "value": "critical" }
  ]
}
```

### Assertion Operators

| Op | Description | Example |
|---|---|---|
| `equals` | Exact match | `{"op": "equals", "value": "pass"}` |
| `notEquals` | Negated match | `{"op": "notEquals", "value": "fail"}` |
| `startsWith` | Prefix match | `{"op": "startsWith", "value": "sha256:"}` |
| `exists` | Checks field exists | `{"op": "exists"}` |
| `includes` | Array includes value | `{"op": "includes", "value": ["a", "b"]}` |
| `lengthEquals` | Array length check | `{"op": "lengthEquals", "value": 5}` |

## Supported Kinds

| Kind | Description | Runner |
|---|---|---|
| `core_proof` | Core proof execution | `runCoreProof()` |
| `policy` | Policy engine decisions | `runPolicy()` |
| `audit` | Audit system checks | `runAudit()` |

## Baseline System

Baselines capture stable facts about eval results (no timestamps/durations).

```json
{
  "schema_version": "dax.eval.baseline.v1",
  "suite": "smoke",
  "generated": "2026-05-02T12:00:00Z",
  "scenarios": {
    "policy_deny_destructive": {
      "passed": true,
      "checks": {
        "decision": true,
        "risk": true
      }
    }
  }
}
```

## Adding New Scenarios

1. Create fixture in `fixtures/<kind>/`
2. Create scenario in `scenarios/`
3. Validate: `bun run eval:smoke -- <suite>`
4. Update baseline: `bun run eval:smoke -- --update-baseline`

## Release Verification

```bash
# Included in release verification
bun run release:verify  # includes eval:smoke
```

## Principles

1. **Deterministic**: No timestamps/randomness in evals
2. **Local**: No external API calls
3. **Fast**: Completes in seconds
4. **Readable**: Clear scenario names and assertions
5. **Robust**: Schema validation, baseline comparison
