# Providers

Rook separates three concepts that other agent tools tend to conflate:

- **Agent** — the worker that does the actual work. Rook native, Claude Code, Codex, Cursor Agent, DAX Agent.
- **Provider** — the model source (only relevant when the agent is Rook native). OpenAI, Anthropic, Google Gemini, Google Gemini Pro/Plus, ChatGPT Codex, OpenRouter, Ollama, etc.
- **Model** — the specific model from that provider. e.g. `gemini-2.5-pro`, `claude-sonnet-4`, `gpt-4o`.

External agents (Claude Code, Codex, Cursor) bring their own model loop. For those, only the Agent selection matters — the agent's own setup determines which model gets used.

## Setup

```bash
rook configure
```

Walks through provider selection and authentication. For OAuth-based providers (Google Gemini Pro/Plus, ChatGPT Codex), this triggers a browser sign-in. For API-key providers (OpenAI, Anthropic, raw Google Gemini), this prompts for the key.

The desktop Settings → Providers screen runs the same flow under the hood.

## Switching at runtime

In the TUI or desktop chat input, the picker shows three columns when Agent is set to Rook:

```
Agent      Provider                Model
[Rook] ✓   [ChatGPT Codex]         gpt-5.4
           [Google Gemini Pro/Plus]
           [OpenAI]
           [...]
```

For external agents, only Agent and Model columns appear (model selection is handled by the agent itself).

## Configuration storage

Per-provider credentials live under `~/.config/rook/`:

- API-key providers store keys in `config.yaml` under the providers section.
- OAuth providers store tokens in their own subdirectory: `~/.config/rook/gemini_oauth/tokens.json`, `~/.config/rook/chatgpt_codex/tokens.json`.

## Environment variables

```bash
ROOK_PROVIDER=anthropic           # active model provider id
ROOK_MODEL=claude-sonnet-4        # specific model within that provider
```

These set defaults; the picker and `rook configure` override them at runtime.

## Throttling and capacity

Some providers throttle aggressively, especially preview-tier Gemini models. Rook's runtime retries on standard 429s, but capacity-exhaustion 429s on preview models can exhaust the retry budget. If a model returns persistent capacity errors, switch to a sibling model (e.g. `gemini-2.5-flash` instead of `gemini-3-flash-preview`).

## Adding a new provider

Provider definitions live in `crates/rook/src/providers/`. Each provider implements the `Provider` trait, exposes a `KNOWN_MODELS` list, and registers itself in `crates/rook/src/providers/init.rs`.
