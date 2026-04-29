<div align="center">

# rook

_a tool-aware, governance-friendly AI agent for the terminal and desktop_

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="Apache 2.0"></a>
  <a href="https://github.com/ShaileshRawat1403/rook/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ShaileshRawat1403/rook/ci.yml?branch=main" alt="CI"></a>
</p>
</div>

Rook is an open-source AI agent built in Rust, with a terminal-first CLI, a Tauri desktop surface, MCP extension support, and multi-provider model access. It is being built around one idea: agent execution should be **visible**, **governable**, and **approachable to people who aren't developers by trade**.

## What this project is

Rook is a [fork of goose](docs/origin.md) — the open-source AI agent now stewarded by the Agentic AI Foundation. Goose gave Rook a real runtime to start from. Rook takes that runtime in a different direction:

- **Visible execution.** Every tool the agent picks, every file it touches, every decision it makes is surfaced — not buried in logs.
- **Governance as a seat at the table.** Rook integrates with [DAX](docs/integrations/rook-dax-project-manifesto.md) as an optional governance layer that evaluates risky actions before they happen. The badge in the top bar tells you whether DAX is watching.
- **Approachable to non-developers.** Provider setup, model selection, agent picking, and the workflow surface are designed for someone who can describe what they want, even when they can't write the code.

## Why "rook"?

A rook is a bird. The identity is about how it behaves:

- **Sophisticated tool-user.** Rooks select and improvise the right tool for the task.
- **Coordinated colony.** Rooks work as a group, not as soloists.
- **Sentinel behavior.** Rooks watch while the rest of the colony works.
- **Non-predatory wisdom.** Rooks forage and surface what was hidden.

The full philosophy lives in the [manifesto](docs/integrations/rook-dax-project-manifesto.md).

## Get started

```bash
# Build from source
git clone https://github.com/ShaileshRawat1403/rook.git
cd rook
source bin/activate-hermit
cargo build -p rook-cli

# Run the CLI
./target/debug/rook --help

# Or launch the interactive TUI
just rook
```

For the desktop app:

```bash
cd ui/rook
ROOK_BIN=$PWD/../../target/debug/rook pnpm tauri dev
```

## What you can do today

- Pick an agent (Rook native, Claude Code, Codex, Cursor) and a model provider
- Run governed sessions with optional DAX Sentinel evaluating tool calls
- Use MCP extensions for local tool execution
- Switch providers and models without leaving the UI
- Inspect every step of a session in the chat surface

## Honest state of the project

Rook is being built solo, by a non-developer, for non-developers as much as for engineers. Some surfaces are still rough. Some integrations are still in design. The [manifesto](docs/integrations/rook-dax-project-manifesto.md) and the [design docs](docs/integrations/) say what's stable, what's planned, and what's deferred. Issues and feedback are welcome.

## Documentation

- [Origin](docs/origin.md) — where Rook came from and why
- [Quickstart](docs/quickstart.md)
- [CLI](docs/cli.md)
- [Desktop](docs/desktop.md)
- [Providers](docs/providers.md)
- [MCP](docs/mcp.md)
- [Configuration](docs/configuration.md)
- [Development](docs/development.md)
- [DAX Agent + Sentinel design](docs/integrations/dax-agent-and-sentinel.md)
- [Rook + DAX manifesto](docs/integrations/rook-dax-project-manifesto.md)

## Community

- [GitHub Issues](https://github.com/ShaileshRawat1403/rook/issues)
- [Releases](https://github.com/ShaileshRawat1403/rook/releases)
