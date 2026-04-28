# Contributing

Rook is under active experimental development.

The current priority is decoupling the project from its fork origin, stabilizing the CLI/TUI experience, and building a lighter Rook-native desktop surface.

## Development

```bash
source bin/activate-hermit
cargo build -p rook-cli
cargo test
```

## Pull requests

Keep changes small and focused.

Good first areas:

* Rook CLI/TUI polish
* Rook desktop stability
* documentation cleanup
* provider setup
* tests and diagnostics

## Project direction

Rook focuses on visible, inspectable, human-governed AI workflows.
