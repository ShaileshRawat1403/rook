<div align="center">

# rook

_an open source AI agent for the terminal: tool-using, coordinated, and transparent_

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="Apache 2.0"></a>
  <a href="https://discord.gg/rook-oss"><img src="https://img.shields.io/discord/1287729918100246654?logo=discord&logoColor=white&label=Join+Us&color=1f6feb" alt="Discord"></a>
  <a href="https://github.com/ShaileshRawat1403/rook/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ShaileshRawat1403/rook/ci.yml?branch=main" alt="CI"></a>
</p>
</div>

Rook is a Rust AI agent framework with a terminal-first CLI, MCP support, multi-provider model access, and a desktop surface. It is built for people who want an agent that can inspect, plan, use tools, and execute work from a real workstation interface.

## Why "Rook"?

Rook is a bird, not the chess piece.

The identity is about biological intelligence and coordinated agency:

- Sophisticated tool-user: rooks select and improvise the right tool for the task.
- Orchestrated multi-agent logic: rooks operate as a coordinated colony.
- Sentinel behavior: rooks watch while the rest of the colony works.
- Non-predatory wisdom: rooks forage and uncover what is hidden.

The philosophy is simple: the power is in the collective.

## Get Started

```bash
# Install the CLI
curl -fsSL https://github.com/ShaileshRawat1403/rook/releases/download/stable/download_cli.sh | bash

# Or build from source
git clone https://github.com/ShaileshRawat1403/rook.git
cd rook
source bin/activate-hermit
cargo build -p rook-cli

# Run the CLI
./target/debug/rook --help
```

To launch the interactive CLI:

```bash
just rook
```

## What Rook Gives You

- Terminal-native agent workflows with a structured session stream
- Provider-driven model setup and switching
- MCP extension support and local tool execution
- Governance controls for approvals, posture, and session mode
- Rust core plus CLI, server, and desktop surfaces in one codebase

## Documentation

- [Quickstart](https://github.com/ShaileshRawat1403/rook#quickstart)
- [CLI Reference](https://github.com/ShaileshRawat1403/rook/blob/main/docs/cli.md)
- [Provider Setup](https://github.com/ShaileshRawat1403/rook/blob/main/docs/providers.md)
- [MCP Extensions](https://github.com/ShaileshRawat1403/rook/blob/main/docs/mcp.md)

## Community

- [Discord](https://discord.gg/rook-oss)
- [GitHub Issues](https://github.com/ShaileshRawat1403/rook/issues)
- [Releases](https://github.com/ShaileshRawat1403/rook/releases)
