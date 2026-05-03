# Personas Source Map

Rook personas are loaded from three distinct sources.

## Built-in Personas

Built-in personas such as Corvus, Huginn, and Muninn are defined as Rust structs in:

`ui/rook/src-tauri/src/types/builtin_personas.rs`

These are loaded via `builtin_personas()` in the backend and merged into the `PersonaStore`.

## Custom UI Personas

Personas created through the UI are persisted to:

`~/.rook/personas.json`

## Markdown Personas

File-based personas are loaded from:

`~/.rook/agents/*.md`

Each markdown persona requires YAML frontmatter:

```yaml
---
name: Example Persona
description: Optional short description
---
```

The markdown body becomes the system prompt.

## Runtime Flow

1. **Frontend Request**: `ui/rook/src/features/agents/hooks/usePersonas.ts` calls `api.listPersonas()`.
2. **API Bridge**: `ui/rook/src/shared/api/agents.ts` maps calls to Tauri commands.
3. **Tauri Commands**: `ui/rook/src-tauri/src/commands/agents.rs` delegates to `PersonaStore`.
4. **Persona Store**: `ui/rook/src-tauri/src/services/personas.rs` merges the three sources above.
