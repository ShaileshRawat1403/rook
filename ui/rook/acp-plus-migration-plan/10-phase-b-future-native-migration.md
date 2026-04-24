# Step 10: Phase B — Migrate Config, Personas, Skills, Projects, Git, Doctor to `rook serve`

## Objective

Migrate each remaining Rust Tauri subsystem behind `rook serve` ACP extension methods, callable from TypeScript via `client.rook.<method>()`. This requires backend changes to the rook crate — adding new ACP extension methods to `rook serve`.

## Current State After Phase A (Steps 01–09)

| Module | Rust File(s) | Lines | Native Dependency |
|--------|-------------|-------|-------------------|
| Config (config.yaml, secrets, keyring) | `services/rook_config.rs`, `services/provider_defs.rs` | ~590 | Keyring, file system |
| Credentials commands | `commands/credentials.rs` | ~50 | RookConfig |
| Personas | `services/personas.rs`, `types/agents.rs`, `types/builtin_personas.rs` | ~920 | File system |
| Persona commands | `commands/agents.rs` | ~210 | PersonaStore |
| Skills | `commands/skills.rs` | ~320 | File system |
| Projects | `commands/projects.rs` | ~495 | File system |
| Git operations | `commands/git.rs`, `commands/git_changes.rs` | ~570 | Shell commands |
| Doctor | `commands/doctor.rs` | ~15 | `doctor` crate |
| Agent setup | `commands/agent_setup.rs` | ~310 | Shell commands, streaming output |
| Model setup | `commands/model_setup.rs` | ~220 | Shell commands, streaming output |
| System utilities | `commands/system.rs` | ~360 | File system, dialog |
| **Total** | | **~4,060** | |

## Migration Pattern

For each subsystem:

1. **Backend**: Add ACP extension methods to `rook serve` (in `rook-acp` or `rook` crate)
2. **Schema**: Regenerate the ACP schema (`npm run build:schema` in `ui/acp/`)
3. **Client**: `RookExtClient` auto-generates typed methods from the schema
4. **Frontend**: Replace `invoke("rust_command")` calls with `client.rook.<method>()` calls
5. **Cleanup**: Delete the Rust Tauri command and service code

## Subsystem Migration Details

### B1: Config Management

**Priority: High** — Config is needed for provider setup, part of the core onboarding flow.

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/config/get` | `{ key: string }` | `{ value: string \| null }` |
| `rook/config/set` | `{ key: string, value: string }` | `{}` |
| `rook/config/delete` | `{ key: string }` | `{ removed: boolean }` |
| `rook/secret/getMasked` | `{ key: string }` | `{ value: string \| null }` |
| `rook/secret/set` | `{ key: string, value: string }` | `{}` |
| `rook/secret/delete` | `{ key: string }` | `{ removed: boolean }` |
| `rook/provider/status` | `{ providerId: string }` | `{ providerId: string, isConfigured: boolean }` |
| `rook/provider/statusAll` | `{}` | `{ providers: [{ providerId: string, isConfigured: boolean }] }` |
| `rook/provider/fields` | `{ providerId: string }` | `{ fields: [{ key: string, value: string \| null, isSet: boolean, isSecret: boolean, required: boolean }] }` |
| `rook/provider/deleteConfig` | `{ providerId: string }` | `{}` |

#### Backend Notes

- The rook binary already has config management internally (`rook configure`). The extension methods expose the same logic over ACP.
- Keyring access happens in the `rook serve` process (which runs natively), so there is no loss of capability.
- Move `provider_defs.rs` static definitions to the rook crate.

#### Frontend Changes

- `invoke("get_provider_config")` → `client.rook.rookProviderFields({ providerId })`
- `invoke("save_provider_field")` → `client.rook.rookSecretSet({ key, value })` or `client.rook.rookConfigSet({ key, value })`
- `invoke("delete_provider_config")` → `client.rook.rookProviderDeleteConfig({ providerId })`
- `invoke("check_all_provider_status")` → `client.rook.rookProviderStatusAll({})`
- `invoke("restart_app")` — remains in Rust (native window management)

#### Files Deleted

- `src-tauri/src/services/rook_config.rs`
- `src-tauri/src/services/provider_defs.rs`
- `src-tauri/src/commands/credentials.rs` (except `restart_app`)
- `keyring` dependency from `Cargo.toml` (all 3 platform variants)
- `etcetera` dependency

---

### B2: Personas

**Priority: Medium** — Used in the chat flow but not on the critical path.

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/personas/list` | `{}` | `{ personas: Persona[] }` |
| `rook/personas/create` | `CreatePersonaRequest` | `{ persona: Persona }` |
| `rook/personas/update` | `{ id: string, ...UpdatePersonaRequest }` | `{ persona: Persona }` |
| `rook/personas/delete` | `{ id: string }` | `{}` |
| `rook/personas/refresh` | `{}` | `{ personas: Persona[] }` |
| `rook/personas/export` | `{ id: string }` | `{ json: string, suggestedFilename: string }` |
| `rook/personas/import` | `{ fileBytes: number[], fileName: string }` | `{ personas: Persona[] }` |
| `rook/personas/saveAvatar` | `{ personaId: string, bytes: number[], extension: string }` | `{ filename: string }` |
| `rook/personas/avatarsDir` | `{}` | `{ path: string }` |

#### Backend Notes

- Persona storage (`~/.rook/personas.json`, `~/.rook/agents/*.md`) and avatar handling (`~/.rook/avatars/`) are file-based. The rook binary can read/write these directly.
- Move builtin persona definitions from `types/builtin_personas.rs` to the rook crate.

#### Files Deleted

- `src-tauri/src/services/personas.rs`
- `src-tauri/src/types/agents.rs`
- `src-tauri/src/types/builtin_personas.rs`
- `src-tauri/src/types/messages.rs`
- `src-tauri/src/types/mod.rs`
- `src-tauri/src/commands/agents.rs`

---

### B3: Skills

**Priority: Low**

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/skills/list` | `{}` | `{ skills: SkillInfo[] }` |
| `rook/skills/create` | `{ name, description, instructions }` | `{}` |
| `rook/skills/update` | `{ name, description, instructions }` | `{ skill: SkillInfo }` |
| `rook/skills/delete` | `{ name: string }` | `{}` |
| `rook/skills/export` | `{ name: string }` | `{ json: string, filename: string }` |
| `rook/skills/import` | `{ fileBytes: number[], fileName: string }` | `{ skills: SkillInfo[] }` |

#### Files Deleted

- `src-tauri/src/commands/skills.rs`

---

### B4: Projects

**Priority: Low**

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/projects/list` | `{}` | `{ projects: ProjectInfo[] }` |
| `rook/projects/create` | `{ name, description, prompt, icon, color, ... }` | `{ project: ProjectInfo }` |
| `rook/projects/update` | `{ id, name, description, prompt, icon, color, ... }` | `{ project: ProjectInfo }` |
| `rook/projects/delete` | `{ id: string }` | `{}` |
| `rook/projects/get` | `{ id: string }` | `{ project: ProjectInfo }` |
| `rook/projects/listArchived` | `{}` | `{ projects: ProjectInfo[] }` |
| `rook/projects/archive` | `{ id: string }` | `{}` |
| `rook/projects/restore` | `{ id: string }` | `{}` |

#### Files Deleted

- `src-tauri/src/commands/projects.rs`

---

### B5: Git Operations

**Priority: Medium** — Git state is shown in the workspace widget and context panel.

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/git/state` | `{ path: string }` | `GitState` |
| `rook/git/changedFiles` | `{ path: string }` | `{ files: ChangedFile[] }` |
| `rook/git/switchBranch` | `{ path, branch }` | `{}` |
| `rook/git/stash` | `{ path }` | `{}` |
| `rook/git/init` | `{ path }` | `{}` |
| `rook/git/fetch` | `{ path }` | `{}` |
| `rook/git/pull` | `{ path }` | `{}` |
| `rook/git/createBranch` | `{ path, name, baseBranch }` | `{}` |
| `rook/git/createWorktree` | `{ path, name, branch, createBranch, baseBranch? }` | `CreatedWorktree` |

#### Backend Notes

- Git operations run shell commands (`git status`, `git switch`, etc.). The rook binary runs these the same way.
- The `ignore` crate for `.gitignore`-aware file scanning in `list_files_for_mentions` moves to rook serve as well.

#### Files Deleted

- `src-tauri/src/commands/git.rs`
- `src-tauri/src/commands/git_changes.rs`

---

### B6: Doctor

**Priority: Low** — Diagnostic tool, not on the critical path.

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/doctor/run` | `{}` | `DoctorReport` |
| `rook/doctor/fix` | `{ checkId: string, fixType: string }` | `{}` |

#### Backend Notes

The `doctor` crate already exists in the rook ecosystem. The extension methods expose it over ACP.

#### Files Deleted

- `src-tauri/src/commands/doctor.rs`
- `doctor` dependency from `Cargo.toml`

---

### B7: Agent & Model Setup

**Priority: Medium** — Needed for onboarding third-party agents and OAuth flows.

This subsystem involves interactive shell commands with streaming output. The current Rust code spawns a child process and streams stdout/stderr lines as Tauri events (`agent-setup:output`, `model-setup:output`).

#### Recommendation: Keep in Rust

These commands remain as Tauri-native commands. They are inherently interactive (opening browsers for OAuth, waiting for user input), are rarely called (only during onboarding), and migrating them would require designing a new ACP streaming notification type. They stay as the last remaining Tauri commands.

---

### B8: System Utilities

**Priority: Low**

#### Extension Methods

| Method | Request | Response |
|--------|---------|----------|
| `rook/system/homeDir` | `{}` | `{ path: string }` |
| `rook/system/pathExists` | `{ path: string }` | `{ exists: boolean }` |
| `rook/system/listDir` | `{ path: string }` | `{ entries: FileTreeEntry[] }` |
| `rook/system/listFilesForMentions` | `{ roots: string[], maxResults?: number }` | `{ files: string[] }` |

#### Stays in Rust: `saveExportedSessionFile`

This command uses `tauri_plugin_dialog` to show a native save dialog. It cannot move to `rook serve`.

#### Files Deleted

- `src-tauri/src/commands/system.rs` (except `save_exported_session_file`)
- `ignore` dependency from `Cargo.toml`

---

## End State After Phase B

**Rust Tauri backend (~780 lines):**

```
src-tauri/src/
  lib.rs                    — ~40 lines: spawn rook serve, register ~3 commands
  main.rs                   — 6 lines (unchanged)
  commands/
    mod.rs                  — 3 modules
    acp.rs                  — get_rook_serve_url (~15 lines)
    system.rs               — save_exported_session_file (~40 lines)
    agent_setup.rs          — install/auth agents (~310 lines)
    model_setup.rs          — model provider auth (~220 lines)
  services/
    mod.rs                  — 1 module
    acp/
      mod.rs                — 1 module
      rook_serve.rs        — RookServeProcess (~150 lines)
```

**Cargo.toml dependencies (minimal):**

```toml
tauri = "2"
tauri-plugin-opener = "2"
tauri-plugin-dialog = ">=2,<2.7"
tauri-plugin-window-state = "2"
tauri-plugin-log = "2"
serde = "1"
serde_json = "1"
tokio = "1"
dirs = "6"
log = "0.4"
```

## Migration Order

| Step | Effort | Value | Order |
|------|--------|-------|-------|
| B1 (Config) | Medium | High (removes keyring dep) | 1st |
| B5 (Git) | Medium | Medium | 2nd |
| B2 (Personas) | Medium | Medium | 3rd |
| B3 (Skills) | Small | Small | 4th |
| B4 (Projects) | Small | Small | 5th |
| B6 (Doctor) | Small | Small | 6th |
| B8 (System utils) | Small | Small | 7th |
| B7 (Agent/Model setup) | — | — | Keep in Rust |

All steps are blocked on implementing the corresponding backend ACP methods, except B7 which remains native.

## Workflow Per Subsystem

1. Design the ACP extension method schemas in `crates/rook-acp/`
2. Implement the handlers in the rook serve server
3. Regenerate the schema: `cd ui/acp && npm run build:schema`
4. Rebuild the TS client: `cd ui/acp && npm run build`
5. Update rook2: use the new `client.rook.<method>()` calls
6. Delete the Rust Tauri code

Each subsystem migrates independently. The frontend can use a mix of `invoke()` (not-yet-migrated) and `client.rook.*()` (migrated) during the transition.
