# Configuration

Rook configuration lives in your XDG config directory — typically `~/.config/rook` on macOS and Linux.

## Common environment variables

```bash
ROOK_PROVIDER=        # active model provider (e.g. anthropic, openai, gemini_oauth)
ROOK_MODEL=           # specific model id within that provider
ROOK_PATH_ROOT=       # override the Rook config root
ROOK_SENTINEL=dax     # opt into DAX Sentinel governance (default: off)
ROOK_BIN=             # explicit path to the rook CLI binary (useful in dev)
```

## Provider credentials

Per-provider credentials live under `~/.config/rook/`:

- API-key providers: in `config.yaml` under the providers section
- OAuth providers (Gemini Pro/Plus, ChatGPT Codex): in their own subdirectories as `tokens.json`

The Settings → Providers screen in the desktop app drives this configuration through `rook configure --provider <id>`.
