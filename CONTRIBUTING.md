# Contributing

Rook is under active experimental development.

The current priorities are governance integration with DAX, visible execution surfaces in the desktop and CLI, and documentation that's approachable to non-developers.

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
