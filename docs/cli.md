# Rook CLI

Rook ships a single binary, `rook`. Without arguments it launches the terminal interface (TUI). With a subcommand it runs that subcommand directly.

## Interactive

```bash
rook
```

Opens the TUI. First-time use walks through provider setup; after that the TUI is the default chat surface.

## Sessions

```bash
rook session                   # start a new chat session
rook session --resume          # resume the most recent session
rook session list              # list all available sessions
rook session export <id>       # export a session as JSON
```

## Single-shot prompts

```bash
rook run --text "Summarize the README."
rook run --instructions path/to/file.md
echo "List the open TODOs" | rook run --instructions -
```

`run` is non-interactive — it executes the prompt and prints the result. Useful for scripting and CI use.

## Setup and diagnosis

```bash
rook configure                          # interactive provider setup
rook configure --provider <id>          # non-interactive (used by the desktop app)
rook doctor                             # check your setup
rook info                               # display current configuration
```

## Project shortcuts

```bash
rook project                  # open the last project directory
rook projects                 # list recent projects
```

## Server / agent surfaces

```bash
rook serve                    # ACP server over HTTP and WebSocket (used by the desktop app)
rook acp                      # ACP agent over stdio (used by other ACP hosts)
rook mcp --help               # bundled MCP servers
```

## Other

```bash
rook recipe ...               # recipe utilities for validation and deeplinking
rook gateway ...              # external platform integrations
rook term                     # terminal-integrated session
rook update                   # update the rook CLI
rook completion <shell>       # shell completion script
```

## DAX Sentinel

When `ROOK_SENTINEL=dax` is set in the environment, the TUI's permission events route through DAX for governance evaluation. See [Configuration](configuration.md) and [DAX Agent + Sentinel design](integrations/dax-agent-and-sentinel.md).

## Help

`rook help <subcommand>` (or `rook <subcommand> --help`) prints full help for any command.
