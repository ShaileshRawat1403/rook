# Colony v1 — Product Note

## Product Positioning

**Colony is a governed orientation layer for multi-role AI work.**

It helps humans stay oriented while AI work moves across roles, sessions, models, context, and evidence.

## Product Grammar

| Concept | UI Element | Meaning |
|---------|-----------|---------|
| Intent → Task | Task board | What work exists |
| Context → Handoff | Handoff panel | Curated context transfer |
| Role → Seat | Seat cards | Who owns what |
| Governance → Sentinel | Sentinel toggle | Risk control |
| Evidence → Activity | Activity panel | What happened |
| Attention → Context Budget | Load indicator | How heavy is the context? |
| Model → Seat Model → Session | Model dropdown | Which model? |

## Current Capabilities

- **Roles**: Planner, Worker, Reviewer (Sentinel for governance)
- **Tasks**: Create, assign, track status (To Do → Done)
- **Handoffs**: Create, copy prompt, review (with templates)
- **Context Budget**: Light / Medium / Heavy load indicators
- **Evidence**: Click activity rows for detail panel
- **Model Control**: Select model per seat; syncs to linked session
- **Sessions**: Create per seat, open, unbind

## Non-Goals

- No automatic execution
- No hidden chat history transfer
- No autonomous multi-agent loop
- No model auto-routing
- No token-level context accounting
- No hidden prompt injection

## Version History

| Version | Feature |
|---------|---------|
| v0.1 | Design + UI shell |
| v0.2 | Seat-to-session binding |
| v0.3 | Shared transcript |
| v0.4 | Session preview |
| v0.5 | Task board |
| v0.6 | Manual handoffs |
| v0.7 | UX polish |
| v0.8 | Task-to-handoff trace |
| v0.9 | Reviewer checklist |
| v1.0 | Context budget |
| v1.1 | Evidence view |
| v1.2 | Model selection |
| v1.3 | Model sync |

## Integration Points

- `ColonySeat` binds to `ChatSession` via sessionId
- Handoffs produce copyable prompts (clipboard)
- Activity logs as evidence
- Model preference syncs to linked session via chatSessionStore
- Sentinel toggles governance mode (dax_open)

## Future Integration

- Model registry (modelId → modelName → provider)
- Token accounting per handoff
- Context pruning suggestions
- Role-specific task templates
- Multi-colony support (future)