# Rook + DAX Integration: DAX Seat

Status: design, not yet implemented. Source of truth for the "Rook colony with DAX as Sentinel / DAX as Agent" direction. Written against the actual state of both repos as of 2026-04-28.

## 1. Thesis

Rook and DAX are peer execution systems with different temperaments:

- **Rook** — adaptive agent workstation. Owns the visible UI, agent picker, ACP/MCP breadth, desktop shell, colony UX.
- **DAX** — governed execution authority. Owns lifecycle (intent → plan → execution → intervention → output → trust), approvals, evidence, audit posture, RAO protocol.

The bridge is **accountable agency**, not subordination. Neither repo should depend on the other as a build-time requirement. Integration is via process boundary (ACP, JSON, CLI), not shared packages.

## 2. Two product modes

### Mode A: DAX Agent

DAX is selected like Claude or Codex. Rook UI hosts the session; DAX owns the run lifecycle.

```
User prompt in Rook UI → Rook ACP client → dax acp (DAX ACP server)
                                                  ↓
                          DAX lifecycle: plan, approval, execution, evidence
                                                  ↓
                                  session updates streamed back to Rook UI
```

Best for: governed edits, release readiness, repo audits, security-sensitive work.

### Mode B: DAX Sentinel

Another agent (Claude, Codex, Rook native) does the work. DAX watches proposed actions and decides allow / deny / modify / needs-approval.

```
User prompt → selected agent → proposes action via ACP requestPermission
                                                  ↓
                          Rook intercepts and calls DAX governance
                                                  ↓
                          DAX returns GovernanceDecision
                                                  ↓
                          Rook displays decision; user is final operator
```

Best for: tool-heavy multi-agent sessions where you want approval semantics without losing the assistant of choice.

## 3. What's actually in each repo today

### Rook seams that already exist

| Seam | Path | Current behavior | What changes |
|---|---|---|---|
| ACP permission callback | `ui/rook/src/shared/api/acpConnection.ts:38-48` | Auto-selects `args.options[0].optionId ?? "approve"` | Replace with Sentinel call |
| Provider catalog (UI) | `ui/rook/src/features/providers/providerCatalog.ts:8` | TS array of `ProviderCatalogEntry` | Add `dax` entry |
| Provider runtime (Rust) | `crates/rook/src/providers/` (e.g. `codex_acp.rs`) | Per-provider Rust modules with install/auth metadata | Add `dax_acp.rs` mirror if needed for setup wizard |
| Agent setup commands | `ui/rook/src-tauri/src/commands/agent_setup.rs` | Tauri commands that run install/auth shell commands | Reused as-is |

### DAX seams that already exist

| Capability | Path | State |
|---|---|---|
| ACP agent server | `dax/packages/dax/src/acp/agent.ts` | Full `Agent` impl from `@agentclientprotocol/sdk` — initialize, sessions, prompts |
| `dax acp` CLI subcommand | `dax/packages/dax/src/cli/cmd/acp.ts:13` | Working — sets `DAX_CLIENT=acp`, starts ACP server on stdio |
| Approval store/transitions | `dax/packages/dax/src/approval/` | `approval-store.ts`, `approval-transitions.ts`, `approval-types.ts` |
| Governance / policy / audit / trust | `dax/packages/dax/src/governance/` | `policy-engine.ts`, `audit.ts`, `trust.ts`, `trust-verification.ts` |
| Rust core/audit/policy crates | `dax/crates/dax-{core,audit,policy}/` | `events.rs`, `engine.rs`, `posture.rs`, `decision.rs` |
| Install script | `dax/script/install.sh` | Yes |
| RAO protocol spec | `dax/docs/architecture/RAO_PROTOCOL.md` | RunRequest, RunState, ApprovalRequest, etc. |

**Implication:** the heaviest claim from the original plan — "build a thin dax-acp adapter" — is already done on the DAX side. The actual lift is on the Rook side: a provider catalog entry and a Sentinel hook.

## 4. Phase plan

### Phase 0: Don't touch this yet

The current branch (`chore/rook-decouple-cleanup`) is mid-decoupling. Do not bundle DAX integration into it. Land that PR first. CI must be green and the schema work resolved before any DAX wiring lands.

### Phase 1: Design doc only (this file)

No code. Just this doc plus a mirrored stub in DAX (`dax/docs/integrations/rook-surface.md`) so both repos record the contract.

### Phase 2: DAX appears in Rook agent picker (Mode A surface)

Smallest possible change that puts DAX in front of users.

**Rook changes:**

1. Add to `ui/rook/src/features/providers/providerCatalog.ts`:
   ```ts
   {
     id: "dax",
     displayName: "DAX",
     category: "agent",
     description: "Governed execution: plan, approve, execute, audit",
     setupMethod: "cli_auth",
     binaryName: "dax",
     // Subcommand handling depends on whether ACP launcher supports args;
     // if not, ship a thin `dax-acp` shim that execs `dax acp`.
     installCommand:
       "curl -fsSL https://raw.githubusercontent.com/ShaileshRawat1403/dax/main/script/install.sh | bash",
     authCommand: "dax doctor",
     authStatusCommand: "dax doctor",
     docsUrl: "https://github.com/ShaileshRawat1403/dax",
     tier: "standard",
   }
   ```

2. Add aliases in `providerCatalogAliases.ts` (`dax: "dax"`, `dax_agent: "dax"`).

3. Verify whether Rook's ACP launcher supports passing a subcommand. If not, the simplest workaround is a one-line `dax-acp` shim added to DAX (`dax/packages/dax/bin/dax-acp` → `exec dax acp "$@"`) and use `binaryName: "dax-acp"`.

4. Optional Rust mirror: if other ACP providers have a `crates/rook/src/providers/<name>_acp.rs` file with provider metadata used by setup flow, add `dax_acp.rs` modeled on `codex_acp.rs`.

**DAX changes:**

1. (Optional) Add `bin/dax-acp` shim if Rook can't pass subcommand args.
2. Confirm `dax acp` works against ACP protocol version Rook ships (`PROTOCOL_VERSION` from `@agentclientprotocol/sdk`). Both repos depend on the same SDK package; mismatch is the most likely failure mode.

**Exit criteria:** user picks "DAX" in Rook agent setup, runs the install command, picks DAX in chat, sends a prompt, sees a streamed response. No governance UI yet — just plumbing.

### Phase 3: DAX Sentinel via permission callback (Mode B)

The single highest-leverage seam. Replace the auto-approve in `acpConnection.ts:38-48`.

**Rook changes:**

1. Add a `sentinelClient` module with a `judge(action: ProposedAction): Promise<GovernanceDecision>` interface and two implementations:
   - `noopSentinel` (current behavior — pick first option)
   - `daxSentinel` (call DAX)
2. Selection driven by user setting: `sentinel: "off" | "dax"`. Default off.
3. The `daxSentinel` implementation should call DAX out-of-process (CLI or local HTTP). Start with CLI:
   ```bash
   dax governance evaluate --json <ProposedAction JSON>
   ```
   reading stdout for a `GovernanceDecision` JSON. CLI is easier to ship and audit than spinning up a daemon.
4. Surface the decision in the existing permission UI: when DAX returns `needs_approval`, show DAX's reason and risk in the prompt; when `allow`/`deny`, auto-resolve and log.

**DAX changes:**

1. Add `dax governance evaluate` subcommand (or whatever the existing CLI verb is — check `packages/dax/src/cli/cmd/` for the right home; `approvals.ts` likely has the closest existing surface). It must accept `ProposedAction` JSON on stdin or `--json` and emit `GovernanceDecision` JSON on stdout.
2. Internally route to existing `governance/policy-engine.ts` and `approval/approval-store.ts`.

**Exit criteria:** in Rook with Sentinel=DAX, when Claude/Codex asks for permission to edit a file, Rook calls `dax governance evaluate`, DAX's policy decides, the UI either auto-approves (low risk), auto-denies (blocked), or shows an explainer with DAX's reason for human approval.

### Phase 4: Visible DAX seat panel

Only after Phases 2 and 3 prove out. UI surface in Rook showing:
- DAX status (connected / not configured)
- Current mode (Off / Sentinel / Agent)
- Pending approvals count
- Latest trust posture from the active run

Design this against the same `RunReport` shape (Section 5) so it works in both modes.

### Phase 5: Report import/export

`rook report --json > run.json` and `dax audit --from run.json`. Lowest live coupling, highest replayability. Useful for offline review and CI gates.

## 5. Shared object schemas

Versioned. JSON-first. No shared package — copy the types into each repo (`ui/rook/src/shared/types/governance.ts` and `dax/packages/dax/src/governance/rook-bridge-types.ts`) and keep a CHANGELOG entry in this doc when they change.

```ts
// v0.1.0
type ProposedAction = {
  id: string;
  runId: string;
  sourceAgent: string; // "claude-acp" | "codex-acp" | "rook" | "dax" | ...
  tool: string;        // ACP tool name
  target?: string;     // file path, command target
  command?: string;    // shell command if applicable
  diffPreview?: string;
  reason?: string;
  riskHint?: "low" | "medium" | "high" | "critical";
};

type GovernanceDecision = {
  actionId: string;
  source: "dax";
  decision: "allow" | "deny" | "modify" | "needs_approval";
  risk: "low" | "medium" | "high" | "critical";
  reason: string;
  requiredEvidence?: string[];
  modifiedAction?: ProposedAction; // present when decision === "modify"
};

type EvidenceReceipt = {
  receiptId: string;
  runId: string;
  claim: string;
  proof: string;
  source: string;
  verifiedAt: string; // ISO 8601
};

type RunReport = {
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
  schemaVersion: "0.1.0";
};
```

These align with DAX's existing RAO protocol objects in `dax/docs/architecture/RAO_PROTOCOL.md` (`RunRequest`, `RunState`, `ApprovalRequest`, etc.) but are the boundary types — what crosses the process line. DAX is free to use richer internal representations.

## 6. Boundary rules

**Rook owns:** UI, TUI, agent picker, desktop shell, agent setup wizards, colony UX, friendly translations of governance language.

**DAX owns:** RAO lifecycle, approval semantics, audit posture, trust model, evidence, policy.

**Shared:** the four types above; JSON over stdio for CLI calls; ACP for live agent sessions.

**Neither yet:** shared npm/cargo package; shared database; cross-repo build dependency; one UI replacing the other.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| ACP SDK version drift between repos | Pin `@agentclientprotocol/sdk` to the same version in both `package.json`s. Add a CI check or boot-time warning when versions diverge. |
| DAX subcommand args not passable through Rook's ACP launcher | Ship `bin/dax-acp` shim in DAX. Cheap, removes a class of issues. |
| Sentinel adds latency on every permission request | CLI invocation per request will be slow. Phase 3 starts with CLI; Phase 4 can swap to a long-running local socket if latency hurts. Don't optimize before measuring. |
| Schema drift across the JSON boundary | `schemaVersion` field in `RunReport`; reject unknown major versions; track changes in a CHANGELOG section here. |
| DAX feels "hidden" inside Rook | Mode-switcher in agent header (Off / Sentinel / Agent) plus the visible seat panel in Phase 4. |
| Decoupling PR slippage | Phase 0 rule: nothing in this doc lands until current decoupling work is merged. |

## 8. Open questions (decide before Phase 2)

1. **Subcommand passability.** Does Rook's ACP launcher accept `dax acp` or only a single binary name? If single-binary-only, ship `dax-acp` shim in DAX and register that name in Rook.
2. **Sentinel transport.** CLI per-call (Phase 3 default) vs local HTTP/Unix socket. Default CLI; revisit if latency > ~200ms per permission becomes user-visible.
3. **Where does Sentinel live in DAX's CLI tree?** Likely `dax governance evaluate` or extend `dax approvals` (`packages/dax/src/cli/cmd/approvals.ts`). Read those before adding a new verb.
4. **Risk default.** When DAX is unreachable in Sentinel mode, should Rook fail-open (current auto-approve) or fail-closed (block)? Default fail-open with a visible warning; let the user opt into fail-closed.
5. **Settings location.** Where does `sentinel: "off" | "dax"` live? Probably the same place agent settings are persisted (`ui/rook/src-tauri` config); confirm before Phase 3.

## 9. Non-goals

- Merging the repos.
- Replacing Rook's UI with DAX's TUI or vice versa.
- A shared npm or cargo package in v0.1.
- A grand event protocol covering every internal state of either system. The four boundary types are enough.
- Rewriting either repo's session model.

## 10. Phase summary table

| Phase | Owner of work | Lands when | Reversible? |
|---|---|---|---|
| 0 | Rook | Decoupling PR done | n/a |
| 1 | Both (docs) | Now | Yes |
| 2 | Rook (catalog) + DAX (optional shim) | After Phase 1 | Yes — drop catalog entry |
| 3 | Both (Sentinel hook + governance CLI) | After Phase 2 ships | Yes — flag default off |
| 4 | Rook (UI seat) | After Phase 3 stable | Yes |
| 5 | Both (report I/O) | Independent of 4 | Yes |

## 11. Mirror in DAX

When Phase 1 lands here, mirror this doc in DAX as `dax/docs/integrations/rook-surface.md` — same structure, but written from DAX's vantage (Rook as an external UI surface that consumes RAO). Keep both in sync; both should reference the schemas in Section 5 by version, not redefine them.
