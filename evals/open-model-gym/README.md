# Open Model Gym - Rook Benchmarking

This directory contains benchmarking and evaluation suites for Rook's core features.

## Structure

```
evals/open-model-gym/
├── benchmarks/          # Benchmark definitions (YAML)
│   ├── provider-accuracy.yaml
│   ├── token-counting.yaml
│   ├── session-management.yaml
│   └── tool-execution.yaml
├── results/            # Benchmark results (JSONL)
└── configs/           # Runner configs
    └── default.yaml
```

## Running Benchmarks

```bash
# Run all benchmarks
cargo test -p rook --test benchmark_suite

# Run specific benchmark
cargo test -p rook --test benchmark_suite -- provider-accuracy
```

## Benchmark Categories

1. **Provider Accuracy** - Response quality across providers
2. **Token Counting** - Accuracy of token counting
3. **Session Management** - Session creation/update/delete performance
4. **Tool Execution** - Correctness of tool calls
5. **Gateway/Telegram** - Gateway integration tests
6. **Scheduler** - Scheduler functionality
7. **OAuth Flows** - Gemini, GCP OAuth
8. **Recipe System** - Recipe execution tests
9. **Security Features** - Permission system tests
