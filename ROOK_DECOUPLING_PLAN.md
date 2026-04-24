# De-Goose Execution Guide

This document is for a follow-on coding agent that will complete the migration from Goose-derived naming and compatibility layers to a fully standalone Rook product.

The goal is not a blind string replacement. The goal is a safe, staged decoupling that preserves behavior while removing Goose-specific runtime, UI, config, packaging, and docs surfaces.

## Mission

Completely decouple Rook from Goose across:

- runtime naming
- config paths and env vars
- desktop/Tauri services
- CLI and server surfaces
- docs and install flows
- telemetry and diagnostics
- assets, icons, and component names
- tests, fixtures, snapshots, and generated references

Keep MCP, ACP, session architecture, tool execution, and other protocol/runtime capabilities unless they are specifically Goose-branded wrappers.

## Core Rule

Do not do a repo-wide find/replace.

Work in ordered phases. Each phase must leave the repo building and the touched product surfaces coherent.

## Priority Order

### Priority 0: Safety and Audit

Before editing:

1. Inventory all remaining `goose`, `Goose`, and `GOOSE` references.
2. Classify each reference into one of:
   - active product surface
   - runtime/config compatibility layer
   - desktop/Tauri integration
   - docs/content
   - tests/fixtures/snapshots
   - vendor/third-party
3. Do not touch vendor content unless absolutely necessary.
4. Do not remove compatibility paths until a replacement path exists and migration behavior is defined.

Output required:

- a short classification table by area
- a list of files safe to rename immediately
- a list of files that require compatibility shims

### Priority 1: Product-Facing Runtime and UI

Finish removing Goose branding from all active user-facing surfaces:

- CLI output
- server output
- provider setup text
- OAuth/browser success pages
- desktop labels
- settings labels
- error/help text
- terminal/title text
- onboarding and first-run flows

Acceptance:

- no user-facing product string says Goose unless explicitly documenting project history
- no mixed-brand screens

### Priority 2: Desktop/Tauri Decoupling

This is the most important remaining architectural slice.

Target areas:

- `ui/rook/src-tauri/src/services/acp/goose_serve.rs`
- `ui/rook/src-tauri/src/services/goose_config.rs`
- `ui/rook/src-tauri/src/services/acp/mod.rs`
- commands that call `get_goose_command`
- `.goose` storage/path assumptions
- `GOOSE_BIN`, `GOOSE_PATH_ROOT`, `GOOSE_*` config usage on the desktop side

Required changes:

1. Rename service/module surfaces to Rook-native names.
2. Introduce Rook-native config and path handling.
3. Decide compatibility policy:
   - read old Goose config/data locations
   - migrate forward to Rook locations
   - continue supporting old env vars temporarily if needed
4. Replace desktop process-launching and path resolution terminology with Rook naming.

Acceptance:

- no active desktop/Tauri service/module names use `goose_*`
- desktop can launch and configure Rook without Goose-specific path assumptions

### Priority 3: Config, Paths, and Migration Policy

Define and implement the migration strategy for old installs.

Questions to resolve in code:

1. Should Rook read legacy Goose config by default?
2. Should Rook migrate `~/.config/goose` to `~/.config/rook`?
3. Should Rook continue honoring `GOOSE_*` env vars as aliases? If yes, for how long?
4. Should `.goose` project/artifact folders become `.rook`?

Recommended approach:

- use Rook-native paths as canonical
- read Goose-era paths as legacy fallback during migration
- emit a one-time migration note if legacy paths are used
- add a focused migration utility or first-run migration path

Acceptance:

- canonical pathing is Rook-native
- backward compatibility is explicit, minimal, and documented
- no hidden dependence on Goose locations

### Priority 4: Component and Asset Rename Pass

Rename internal desktop/UI artifacts that are still Goose-branded.

Examples:

- `GooseIcon`
- `LoadingGoose`
- `GooseMessage`
- `goosehints`-named UI components
- `goosed` references if they are no longer intended product names

Rules:

- rename components and imports cleanly
- preserve behavior
- update tests with each rename

Acceptance:

- active component names are Rook-native
- no new code imports Goose-branded UI artifacts

### Priority 5: Documentation and Packaging

Complete the public-facing docs and packaging cleanup.

Target:

- top-level docs
- Docusaurus content
- install scripts
- Docker
- release docs
- prompt library descriptions
- extension pages
- deeplink docs
- community content where product naming is current, not historical

Historical references are allowed only when explicitly describing origin:

- “Rook was born out of Goose”

Acceptance:

- docs present Rook as the current product
- Goose is mentioned only as project history or migration context

### Priority 6: Telemetry, Metrics, and Internal Namespaces

Clean internal namespaces that still encode `goose`.

Examples:

- metric names like `monotonic_counter.goose.*`
- comments describing “goose mode”
- internal tool metadata keys where renaming is safe

Be careful here:

- changing telemetry names may affect dashboards or analytics consumers
- changing message/tool metadata keys may affect compatibility

Required:

- identify which names are externally consumed
- only rename when migration impact is understood

Acceptance:

- internal naming is Rook-native where safe
- compatibility-sensitive keys are documented if retained

### Priority 7: Tests, Fixtures, Snapshots, and Leftover Dead Code

After runtime/UI/path migration is stable:

1. rename stale fixtures and snapshots
2. update snapshot content
3. remove dead Goose-only files that no longer have references
4. remove compatibility code proven to be unused

Examples already identified:

- Goose-named snapshots
- prompt-library/example content
- old desktop test fixtures
- old docs generators pointing to Goose paths

Acceptance:

- test suite passes with Rook-native expectations
- dead Goose-only files are removed

## What Must Be Preserved

Do not remove these just because they came from Goose lineage:

- MCP support
- ACP support
- session manager architecture
- provider abstraction
- tool execution model
- security inspectors
- planner/subagent/runtime capabilities

These are architectural assets, not Goose-specific product baggage.

## What Is Likely Safe To Replace

- branding strings
- component names
- config module names
- service file names
- docs text
- installer env-var names, if legacy aliases remain temporarily
- desktop storage keys, if migrated carefully

## Working Method

For each phase:

1. inspect
2. edit
3. run focused verification
4. summarize remaining residue
5. commit

Do not stack multiple broad renames without intermediate verification.

## Required Verification Per Phase

At minimum:

- `cargo fmt`
- `cargo build -p rook-cli`
- `cargo test -p rook-cli`
- `cargo clippy -p rook-cli --all-targets -- -D warnings`

When touching desktop/Tauri:

- relevant frontend tests
- Tauri build/check path
- manual smoke test of onboarding/settings/provider flows

When touching docs:

- docs build or typecheck if available

## Review Checklist For Final Reviewer

The reviewing agent should check:

1. Are there still mixed-brand product surfaces?
2. Are any critical paths still hardcoded to `.goose` or `GOOSE_*` without documented migration intent?
3. Were any compatibility-sensitive keys renamed without migration planning?
4. Were any dead files removed unsafely?
5. Does the desktop/Tauri layer still depend on Goose-named services?
6. Are remaining Goose references only:
   - historical
   - compatibility
   - vendor
   - tests awaiting later phase cleanup

## Definition Of Done

Rook is fully decoupled from Goose when:

- product-facing runtime and UI are Rook-native
- canonical config/data/project paths are Rook-native
- desktop/Tauri services and modules are Rook-native
- installer/docs/package flows are Rook-native
- tests/fixtures/snapshots no longer encode Goose as the active product
- any retained Goose references are deliberate compatibility/history only

## Suggested Execution Sequence

1. Desktop/Tauri service and config migration
2. Config/path migration and compatibility policy
3. UI component rename pass
4. Docs/package/deeplink cleanup
5. Telemetry/internal namespace cleanup
6. Tests/fixtures/snapshots/dead file cleanup
7. Final residue audit and review

## Instruction To The Follow-On Agent

Do not try to “finish everything” in one commit.

Take one phase at a time, keep the repo valid after each phase, and leave a short residue report at the end of each pass describing:

- what changed
- what remains
- what was intentionally deferred
