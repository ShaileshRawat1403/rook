# Justfile — lightweight Rook (CLI + Tauri web UI)

# list all tasks
default:
  @just --list

# Run the Rook CLI
rook:
    @just require-hermit
    @cargo run -q -p rook-cli

require-hermit:
    @if [ -z "${HERMIT_ENV}" ]; then \
        echo "Hermit is not active."; \
        echo "Run: source bin/activate-hermit"; \
        exit 1; \
    fi

# ─── Build: Rust CLI ────────────────────────────────────────────

build-dev-binaries:
    @just require-hermit
    @echo "Building development CLI..."
    cargo build --package rook-cli --bin rook

release-binary:
    @just require-hermit
    @echo "Building release CLI..."
    cargo build --release --package rook-cli --bin rook

# Build for Intel Mac
release-intel:
    @just require-hermit
    @echo "Building release CLI for Intel Mac..."
    cargo build --release --target x86_64-apple-darwin --package rook-cli --bin rook

# Build Windows executable via Docker (Linux/macOS host) or PowerShell (Windows host)
win_docker_build_sh := '''rustup target add x86_64-pc-windows-gnu && \
    apt-get update && \
    apt-get install -y mingw-w64 protobuf-compiler cmake && \
    export CC_x86_64_pc_windows_gnu=x86_64-w64-mingw32-gcc && \
    export CXX_x86_64_pc_windows_gnu=x86_64-w64-mingw32-g++ && \
    export AR_x86_64_pc_windows_gnu=x86_64-w64-mingw32-ar && \
    export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc && \
    export PKG_CONFIG_ALLOW_CROSS=1 && \
    export PROTOC=/usr/bin/protoc && \
    cargo build --release --target x86_64-pc-windows-gnu --package rook-cli --bin rook
'''

release-windows:
    #!/usr/bin/env sh
    if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "Linux" ]; then
        echo "Building Windows CLI via Docker..."
        docker volume create rook-windows-cache || true
        docker run --rm \
            -v "$(pwd)":/usr/src/myapp \
            -v rook-windows-cache:/usr/local/cargo/registry \
            -w /usr/src/myapp \
            rust:latest \
            sh -c "{{win_docker_build_sh}}"
    else
        echo "Building Windows CLI via Docker through PowerShell..."
        powershell.exe -Command "docker volume create rook-windows-cache; \`
            docker run --rm \`
                -v ${PWD}:/usr/src/myapp \`
                -v rook-windows-cache:/usr/local/cargo/registry \`
                -w /usr/src/myapp \`
                rust:latest \`
                sh -c '{{win_docker_build_sh}}'"
    fi
    echo "Windows rook.exe created at ./target/x86_64-pc-windows-gnu/release/"

# ─── Tauri UI wrappers ──────────────────────────────────────────

# Install UI workspace dependencies (run once after fresh clone)
install-deps:
    @just require-hermit
    cd ui && pnpm install

# Run the Tauri app in dev mode
run-ui:
    @just require-hermit
    cd ui/rook && pnpm tauri dev

# Lint/typecheck the Tauri app
lint-ui:
    @just require-hermit
    cd ui/rook && pnpm check && pnpm typecheck

# Bundle the Tauri app for the current platform
package-ui:
    @just require-hermit
    cd ui/rook && pnpm tauri build

# Convenience: build release CLI then run Tauri app (Tauri spawns the CLI as sidecar for `rook serve`)
run-dev:
    @just release-binary
    @just run-ui

# ─── Style / CI gates ───────────────────────────────────────────

# Run all style checks and formatting (precommit validation)
check-everything:
    @echo "🔧 Running all style checks…"
    @echo "  → Formatting Rust…"
    cargo fmt --all
    @echo "  → Running clippy…"
    cargo clippy --all-targets -- -D warnings
    @echo "  → Checking UI (lint + typecheck + biome)…"
    @just lint-ui
    @echo "✅ All style checks passed."

# ─── Docs ───────────────────────────────────────────────────────

run-docs:
    @just require-hermit
    @echo "Running docs server..."
    cd documentation && yarn && yarn start

# ─── ACP schema / SDK ───────────────────────────────────────────

# Check if generated ACP schema and TypeScript types are up-to-date
check-acp-schema: generate-acp-types
    #!/usr/bin/env bash
    set -e
    echo "🔍 Checking ACP schema and generated types are up-to-date..."
    if ! git diff --exit-code crates/rook-acp/acp-schema.json crates/rook-acp/acp-meta.json ui/sdk/src/generated/; then
      echo ""
      echo "❌ ACP generated files are out of date!"
      echo ""
      echo "Run 'just generate-acp-types' locally, then commit the changes."
      exit 1
    fi
    echo "✅ ACP schema and generated types are up-to-date"

# Generate ACP JSON schema from Rust types
generate-acp-schema:
    @just require-hermit
    @echo "Generating ACP schema..."
    cd crates/rook-acp && cargo run --bin generate-acp-schema
    @echo "ACP schema generated: crates/rook-acp/acp-schema.json, crates/rook-acp/acp-meta.json"

# Generate ACP TypeScript types from JSON schema (requires generate-acp-schema first)
generate-acp-types: generate-acp-schema
    @echo "Generating ACP TypeScript types..."
    cd ui/sdk && npx tsx generate-schema.ts
    @echo "ACP TypeScript types generated in ui/sdk/src/generated/"

# Build SDK TypeScript package (schema + types + compile)
build-sdk: generate-acp-types
    @echo "Compiling ACP TypeScript..."
    cd ui/sdk && pnpm run build:ts
    @echo "ACP package built."

# ─── CLI tooling ────────────────────────────────────────────────

# Generate manpages for the CLI
generate-manpages:
    @just require-hermit
    @echo "Generating manpages..."
    cargo run -p rook-cli --bin generate_manpages
    @echo "Manpages generated at target/man/"

# rebuild canonical model registry and mapping report from models.dev
build-canonical-models:
    @cargo run --bin build_canonical_models

build-test-tools:
  cargo build -p rook-test

record-mcp-tests: build-test-tools
  ROOK_RECORD_MCP=1 cargo test --package rook --test mcp_integration_test
  git add crates/rook/tests/mcp_replays/

# ─── Release plumbing ───────────────────────────────────────────

ensure-release-branch:
    #!/usr/bin/env bash
    branch=$(git rev-parse --abbrev-ref HEAD); \
    if [[ ! "$branch" == release/* ]]; then \
        echo "Error: You are not on a release branch (current: $branch)"; \
        exit 1; \
    fi

    # check that main is up to date with upstream main
    git fetch
    # @{u} refers to upstream branch of current branch
    if [ "$(git rev-parse HEAD)" != "$(git rev-parse @{u})" ]; then \
        echo "Error: Your branch is not up to date with the upstream branch"; \
        echo "  ensure your branch is up to date (git pull)"; \
        exit 1; \
    fi

# validate the version is semver, and not the current version
validate version:
    #!/usr/bin/env bash
    if [[ ! "{{ version }}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
      echo "[error]: invalid version '{{ version }}'."
      echo "  expected: semver format major.minor.patch or major.minor.patch-<suffix>"
      exit 1
    fi

    current_version=$(just get-tag-version)
    if [[ "{{ version }}" == "$current_version" ]]; then
      echo "[error]: current_version '$current_version' is the same as target version '{{ version }}'"
      echo "  expected: new version in semver format"
      exit 1
    fi

get-next-minor-version:
    @python -c "import sys; v=sys.argv[1].split('.'); print(f'{v[0]}.{int(v[1])+1}.0')" $(just get-tag-version)

get-next-patch-version:
    @python -c "import sys; v=sys.argv[1].split('.'); print(f'{v[0]}.{v[1]}.{int(v[2])+1}')" $(just get-tag-version)

# derive the prior release tag from a version
# patch bump (e.g. 1.25.1): prior is v1.25.0 (deterministic)
# minor bump (e.g. 1.26.0): prior is highest v1.25.* GitHub release
get-prior-version version:
    #!/usr/bin/env bash
    IFS='.' read -r major minor patch <<< "{{ version }}"
    if [[ "$patch" -gt 0 ]]; then
      echo "v${major}.${minor}.$((patch - 1))"
    elif [[ "$minor" -gt 0 ]]; then
      prev_minor=$((minor - 1))
      prefix="v${major}.${prev_minor}."
      best=$(gh release list --limit 100 --exclude-drafts --exclude-pre-releases \
        --json tagName --jq "[.[] | select(.tagName | startswith(\"${prefix}\"))][0].tagName")
      if [[ -n "$best" && "$best" != "null" ]]; then
        echo "$best"
      fi
    fi

# update version numbers in all manifests
bump-version version:
    @just validate {{ version }} || exit 1
    @uvx --from=toml-cli toml set --toml-path=Cargo.toml "workspace.package.version" {{ version }}
    @cd ui/rook && npm pkg set "version={{ version }}"
    @uvx --from=toml-cli toml set --toml-path=ui/rook/src-tauri/Cargo.toml "package.version" {{ version }}
    @jq '.version = "{{ version }}"' ui/rook/src-tauri/tauri.conf.json > ui/rook/src-tauri/tauri.conf.json.tmp \
        && mv ui/rook/src-tauri/tauri.conf.json.tmp ui/rook/src-tauri/tauri.conf.json
    # update Cargo.lock after bumping versions in Cargo.toml
    @cargo update --workspace

# rebuild canonical models and commit the version bump
prepare-release version:
    @just bump-version {{ version }}
    @just build-canonical-models
    @git add \
        Cargo.toml \
        Cargo.lock \
        ui/rook/package.json \
        ui/rook/src-tauri/Cargo.toml \
        ui/rook/src-tauri/tauri.conf.json \
        ui/pnpm-lock.yaml \
        crates/rook/src/providers/canonical/data/canonical_models.json \
        crates/rook/src/providers/canonical/data/provider_metadata.json
    @git commit --message "chore(release): release version {{ version }}"

# extract version from Cargo.toml
get-tag-version:
    @uvx --from=toml-cli toml get --toml-path=Cargo.toml "workspace.package.version"

# create the git tag from Cargo.toml, checking we're on a release branch
tag: ensure-release-branch
    git tag v$(just get-tag-version)

# create tag and push to origin (use this when release branch is merged to main)
tag-push: tag
    # this will kick of ci for release
    git push origin tag v$(just get-tag-version)

# generate release notes from git commits
release-notes old:
    #!/usr/bin/env bash
    git log --pretty=format:"- %s" {{ old }}..v$(just get-tag-version)
