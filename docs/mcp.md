# MCP

Rook is built around the [Model Context Protocol](https://modelcontextprotocol.io/) for tool execution. MCP servers expose tools the agent can call; Rook hosts them as extensions.

## Bundled servers

Rook ships several built-in MCP servers. Each runs as a subprocess of the agent:

```bash
rook mcp <server>
```

Available servers are managed through the desktop **Settings → Extensions** screen, which lets you toggle them on or off per project.

## Configuration

Extension configuration lives in `~/.config/rook/config.yaml` under the `extensions` section. Each entry has:

- `enabled: true | false`
- `type` — usually `platform` for bundled servers
- `name` — server identifier
- `description` — human-readable summary

The desktop app and the TUI both read from this same configuration.

## Tools and the agent

When the agent decides to call a tool, the call goes through:

```
agent → ACP requestPermission → (optionally DAX Sentinel) → MCP server → tool result
```

The optional Sentinel hop is documented in [the DAX integration design](integrations/dax-agent-and-sentinel.md). With `ROOK_SENTINEL=dax` set, the permission event routes through DAX before the tool runs.

## Adding an external MCP server

External MCP servers (HTTP, SSE, stdio) can be added through the Extensions settings screen. Provide the command, transport type, and any required environment variables; Rook spawns and manages the process.

## State

This area continues to evolve. The bundled-server set, extension hot-reload behavior, and the per-project enable/disable flow are all stable; richer MCP authoring tools and a public extension marketplace are out of scope for the current release.
