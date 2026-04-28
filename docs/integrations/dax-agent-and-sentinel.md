# Rook + DAX: Agent and Sentinel

Status: design, not yet implemented. Branch: `design/dax-agent-sentinel`. Source of truth for the "Rook colony with DAX as governed execution authority" direction. Written against actual repo state as of 2026-04-28.

## 1. Purpose

Define DAX Agent and DAX Sentinel modes and their seams in Rook before any implementation lands. Keep the architecture intentional, the boundary types versioned, and the phases reversible.

## 2. Product relationship

Rook and DAX are peer execution systems with different temperaments:

- **Rook** — adaptive agent workstation. Owns UI, agent picker, ACP/MCP breadth, desktop shell, colony UX, friendly translations.
- **DAX** — governed execution authority. Owns lifecycle (intent → plan → execution → intervention → output → trust), approvals, evidence, audit posture, RAO protocol.

The bridge is **accountable agency**, not subordination. Neither repo depends on the other as a build-time requirement. Integration is via process boundary (ACP, JSON over stdio, CLI), not shared packages.

Shared thesis:

```
Rook coordinates the colony.
DAX governs the run.
The user remains the operator.
```

## 3. Mode A: DAX Agent

DAX is selected like Claude or Codex. Rook UI hosts the session; DAX owns the lifecycle.

```
User prompt in Rook UI
        ↓
Rook ACP client (existing, unchanged)
        ↓
dax acp                              ← DAX ACP server, already implemented
        ↓
DAX lifecycle: plan, approval, execution, evidence
        ↓
session updates streamed back to Rook UI via ACP
```

**Best for:** governed edits, release readiness, repo audits, security-sensitive work.

**User-facing label:** *DAX Agent — Run the session through DAX.*

## 4. Mode B: DAX Sentinel

Another agent (Claude, Codex, Rook native) does the work. DAX watches proposed actions and decides allow / deny / modify / needs-approval.

```
User prompt → selected agent → proposes action via ACP requestPermission
        ↓
Rook intercepts at acpConnection.ts requestPermission callback
        ↓
Rook converts ACP permission request → ProposedAction JSON
        ↓
Rook calls DAX governance evaluate
        ↓
DAX returns GovernanceDecision JSON
        ↓
Rook displays decision; user is final operator
```

**Best for:** tool-heavy multi-agent sessions where the user wants approval semantics without losing the assistant of choice.

**User-facing label:** *DAX Sentinel — Use DAX only for governance and approvals.*

## 5. Repo reality (validated 2026-04-28)

### Rook seams that already exist

| Seam | Path | Current behavior | Phase that touches it |
|---|---|---|---|
| ACP permission callback | `ui/rook/src/shared/api/acpConnection.ts:38-48` | Auto-selects `args.options[0].optionId ?? "approve"` | Phase 5 |
| Provider catalog (TS, primary) | `ui/rook/src/features/providers/providerCatalog.ts:8` | TS array of `ProviderCatalogEntry` | Phase 2 |
| Provider aliases | `ui/rook/src/features/providers/providerCatalogAliases.ts` | TS map | Phase 2 |
| Provider runtime (Rust, secondary) | `crates/rook/src/providers/` (e.g. `codex_acp.rs`) | Per-provider modules | Phase 2 if needed |
| Agent setup commands | `ui/rook/src-tauri/src/commands/agent_setup.rs` | Tauri commands running install/auth shell commands | Reused as-is |

### DAX capabilities that already exist

| Capability | Path | State |
|---|---|---|
| ACP agent server | `dax/packages/dax/src/acp/agent.ts` | Full `Agent` impl from `@agentclientprotocol/sdk` — initialize, sessions, prompts, permission events, tool call updates, plan updates, reasoning/text streaming |
| `dax acp` CLI subcommand | `dax/packages/dax/src/cli/cmd/acp.ts:13` | Working — sets `DAX_CLIENT=acp`, starts ACP server over stdio via `AgentSideConnection` |
| Approval store/transitions | `dax/packages/dax/src/approval/` | `approval-store.ts`, `approval-transitions.ts`, `approval-types.ts`, `approval-adapter.ts` |
| Governance / policy / audit / trust | `dax/packages/dax/src/governance/` | `policy-engine.ts` (returns allow/deny/ask), `audit.ts`, `trust.ts`, `trust-verification.ts` |
| Rust core/audit/policy crates | `dax/crates/dax-{core,audit,policy}/` | `events.rs`, `engine.rs`, `posture.rs`, `decision.rs` |
| Install script | `dax/script/install.sh` | Yes |
| RAO protocol spec | `dax/docs/architecture/RAO_PROTOCOL.md` | RunRequest, RunState, ApprovalRequest, EvidenceReceipt, OverrideDecision |

**Implication:** the original "build a thin dax-acp adapter" step from earlier drafts was too heavy. Most of it exists. The remaining work is:

- **Rook side:** add a provider catalog entry (Phase 2) and replace the auto-approve in `requestPermission` (Phase 5).
- **DAX side:** decide on `dax acp` vs `dax-acp` shim (Phase 3); add a small `dax governance evaluate` surface that calls existing primitives (Phase 4).

## 6. Shared boundary types

JSON-first. No shared package. Copy types into both repos: `ui/rook/src/shared/types/governance.ts` and `dax/packages/dax/src/governance/rook-bridge-types.ts`. Every type carries `schemaVersion` from day one.

```ts
// schemaVersion: "0.1.0"

type ProposedAction = {
  schemaVersion: "0.1.0";
  id: string;
  runId: string;
  source: "rook";
  sourceAgent: string;       // "claude-acp" | "codex-acp" | "rook" | ...
  tool: string;              // ACP tool name
  target?: string;           // file path or command target
  command?: string;          // shell command if applicable
  reason?: string;
  diffPreview?: string;
  riskHint?: "low" | "medium" | "high" | "critical";
};

type GovernanceDecision = {
  schemaVersion: "0.1.0";
  actionId: string;
  source: "dax";
  decision: "allow" | "deny" | "modify" | "needs_approval" | "persist_rule";
  risk: "low" | "medium" | "high" | "critical";
  reason: string;
  requiredEvidence?: string[];
  modifiedAction?: ProposedAction;  // present when decision === "modify"
  reversible: boolean;
};

type EvidenceReceipt = {
  schemaVersion: "0.1.0";
  receiptId: string;
  runId: string;
  claim: string;
  proof: string;
  source: string;
  verifiedAt: string;        // ISO 8601
};

type RunReport = {
  schemaVersion: "0.1.0";
  runId: string;
  source: "rook" | "dax";
  mode: "agent" | "sentinel" | "native";
  intent: string;
  actions: ProposedAction[];
  decisions: GovernanceDecision[];
  evidence: EvidenceReceipt[];
  artifacts: string[];
  summary: string;
  trustPosture?: "open" | "guarded" | "blocked" | "verified" | "failed";
};
```

These align with DAX's existing RAO objects (`RunRequest`, `RunState`, `ApprovalRequest` in `dax/docs/architecture/RAO_PROTOCOL.md`) but are the **boundary** types — what crosses the process line. DAX is free to use richer internal representations.

Schema changes are tracked in Section 13 of this doc.

## 7. Implementation seams

### Phase 2: provider catalog entry (Rook)

Add to `ui/rook/src/features/providers/providerCatalog.ts`:

```ts
{
  id: "dax-acp",
  displayName: "DAX Agent",
  category: "agent",
  description:
    "Governed execution agent with planning, approvals, evidence, and trust posture.",
  setupMethod: "cli_auth",
  binaryName: "dax",                 // see Phase 3 for the shim decision
  installCommand:
    "curl -fsSL https://raw.githubusercontent.com/ShaileshRawat1403/dax/main/script/install.sh | DAX_REPO=ShaileshRawat1403/dax bash",
  authCommand: "dax auth login",
  authStatusCommand: "dax doctor",
  docsUrl: "https://github.com/ShaileshRawat1403/dax",
  tier: "promoted",
}
```

Add aliases in `providerCatalogAliases.ts`: `dax: "dax-acp"`, `dax_agent: "dax-acp"`.

If other ACP providers carry a Rust mirror (e.g. `crates/rook/src/providers/codex_acp.rs`), add `dax_acp.rs` modeled on it. Otherwise the TS entry alone is enough for the picker.

### Phase 5: Sentinel hook (Rook)

Replace the auto-approve in `acpConnection.ts:38-48`:

```ts
// Before
requestPermission: async (args) => {
  const optionId = args.options?.[0]?.optionId ?? "approve";
  return { outcome: { outcome: "selected", optionId } };
},

// After
requestPermission: async (args) => {
  const sentinel = getSentinel();          // resolves user setting
  if (sentinel.kind === "off") {
    const optionId = args.options?.[0]?.optionId ?? "approve";
    return { outcome: { outcome: "selected", optionId } };
  }
  const action = toProposedAction(args);
  const decision = await sentinel.judge(action);
  return resolvePermission(args, decision);
},
```

`sentinel` is a small interface with two impls:

- `noopSentinel` (current behavior — pick first option)
- `daxSentinel` (calls `dax governance evaluate` over CLI for v0.1)

User setting: `sentinel: "off" | "dax"`, default `off`.

### Phase 4: governance evaluate (DAX)

Add a single CLI surface that wraps existing primitives. Likely homes:

- New verb: `dax governance evaluate`
- Or extend `dax approvals` (`packages/dax/src/cli/cmd/approvals.ts`)

Contract:

```bash
echo '<ProposedAction JSON>' | dax governance evaluate --json -
```

stdout: `GovernanceDecision` JSON. Internally routes to:

- `governance/policy-engine.ts` (allow/deny/ask)
- `approval/approval-store.ts` (persistence)
- `governance/audit.ts` (gate, summary, findings) where applicable

Synchronous CLI is fine for v0.1. A long-running local socket can come later if latency demands it (see Section 9).

## 8. Phase plan

| Phase | Work | Repo | Risk | Reversible |
|---|---|---|---|---|
| 0 | Keep DAX work out of decoupling/schema PRs | both | low | yes |
| 1 | Add design docs (this file + DAX mirror) | Rook → DAX | low | yes |
| 2 | DAX Agent provider catalog entry | Rook | low–medium | yes (drop entry) |
| 3 | Decide `dax acp` vs `dax-acp` shim; ship if shim | DAX (and Rook only if `binaryArgs` is needed) | medium | yes |
| 4 | DAX `governance evaluate` CLI surface | DAX | medium | yes (don't call it) |
| 5 | Wire Rook `requestPermission` to Sentinel; setting + flag | Rook | medium–high | yes (flag default off) |
| 6 | DAX seat UI panel | Rook | medium | yes |
| 7 | Report import/export (`rook report --json` / `dax audit --from`) | both | low–medium | yes |

Phases 2 and 4 can run in parallel. Phase 5 depends on Phase 4. Phase 6 depends on Phase 5 being stable.

## 9. Risks

### 1. ACP SDK version drift

Both repos use `@agentclientprotocol/sdk`. If versions drift, DAX Agent appears installed but fails during runtime negotiation.

**Mitigation:** pin the same version in both `package.json`s. Add a doctor check in Rook's setup flow that compares the installed `dax` binary's reported ACP version against Rook's, surfaces a clear error. Document the expected version range here when Phase 2 lands.

### 2. `dax acp` invocation mismatch

Rook's provider setup currently checks for a binary by name. DAX's ACP entry is a subcommand. Phase 3 must close this gap.

**Mitigation options (pick one in Phase 3):**

- **Shim (recommended):** add `dax/packages/dax/bin/dax-acp` containing `#!/usr/bin/env bash\nexec dax acp "$@"`. Register `binaryName: "dax-acp"` in Rook. Cleanest for users — no Rook change needed.
- **`binaryArgs` in Rook:** extend `ProviderCatalogEntry` to support a `binaryArgs?: string[]`. More flexible but a wider Rook change.

### 3. Sentinel latency

CLI spawn per permission request will be slow (think: tens to low hundreds of ms). May feel sluggish in tool-heavy sessions.

**Mitigation:**
- v0.1: CLI is acceptable. Measure.
- v0.2: persistent local DAX governance daemon (Unix socket or HTTP on loopback) if measurements show user-visible lag.
- Don't optimize before measuring.

### 4. DAX unavailable

When `dax` is not installed, not running, or returns an error, Rook must have a defined behavior.

**Recommended defaults:**

| Posture | Behavior |
|---|---|
| Open | Fail-open (current auto-approve) with a visible warning banner |
| Guarded | Fail-closed; user must approve manually |
| Locked | Fail-closed; deny |

Ship Phase 5 with **Open** as default. Let users opt into Guarded/Locked. Make the posture visible in the UI — silent fail-open is the worst outcome.

### 5. Mode confusion

Users may not understand the difference between DAX Agent and DAX Sentinel.

**Mitigation:** the descriptions in Section 3 and 4 should appear verbatim in agent setup and settings. Consider an inline explainer the first time the user enables either.

### 6. Schema drift

`ProposedAction` / `GovernanceDecision` shapes will evolve.

**Mitigation:** `schemaVersion` on every object. Reject unknown major versions. CHANGELOG entries in Section 13.

### 7. Decoupling regressions

This branch must not pull in unrelated cleanup.

**Mitigation:** scope discipline. The only allowed changes on `design/dax-agent-sentinel` are: this doc, provider catalog entry (Phase 2), and explicitly-Phase-5 changes once Phase 4 has shipped. Out-of-scope cleanup goes to its own branch.

## 10. Open questions (decide before code lands)

1. **`dax acp` vs `dax-acp` shim.** Recommended: shim. Decide in Phase 3 before Phase 2's catalog entry sets `binaryName`.
2. **Sentinel scope.** Global setting, per-workspace, or per-session? Recommended: per-workspace with a global default. Confirm before Phase 5.
3. **Fail-open vs fail-closed default.** Recommended: fail-open (Open posture) with a visible banner. Confirm before Phase 5.
4. **Advisory vs enforcing.** Should the first Sentinel release just *display* DAX's recommendation while the user still picks, or should it actually pre-resolve allow/deny? Recommended: enforce `allow` and `deny` for low/critical; surface `needs_approval` and `modify` to the user. Confirm before Phase 5.
5. **UI surface.** Reuse the existing approval modal or build a dedicated DAX seat panel? Recommended: reuse existing UI in Phase 5; introduce dedicated panel in Phase 6.

## 11. Boundary rules

**Rook owns:** UI, TUI, agent picker, desktop shell, agent setup wizards, colony UX, friendly translations of governance language.

**DAX owns:** RAO lifecycle, approval semantics, audit posture, trust model, evidence, policy.

**Shared:** the four types in Section 6; JSON over stdio for CLI calls; ACP for live agent sessions.

**Neither yet:** shared npm/cargo package; shared database; cross-repo build dependency; one UI replacing the other.

## 12. Non-goals

- Merging the repos.
- Replacing Rook's UI with DAX's TUI or vice versa.
- A shared npm or cargo package in v0.1.
- A grand event protocol covering every internal state of either system. The four boundary types are enough.
- Rewriting either repo's session model.

## 13. Schema changelog

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-04-28 | Initial: ProposedAction, GovernanceDecision, EvidenceReceipt, RunReport |

## 14. Mirror in DAX

When this doc stabilizes, mirror it in DAX as `dax/docs/integrations/rook-agent-surface.md` — same structure, written from DAX's vantage (Rook as an external UI surface that consumes RAO). Both docs reference the schemas in Section 6 by version, not redefine them.

## 15. Residual cleanup (not part of this branch)

Spotted while validating Section 5 but **out of scope** for this branch — flagged for a separate follow-up:

- `ui/rook/src/features/providers/providerCatalog.ts` line ~14: the `rook` entry still says `description: "Block's open-source coding agent"`. Should be something like `"Rook's native agent runtime"` or `"Rook's built-in agent for local AI workflows"`. Tiny, but a leftover from the decoupling.

Do not bundle this with DAX work. Open a separate branch.
