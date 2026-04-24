# Building and Running rook with Docker

This guide covers building Docker images for the rook CLI for production use, CI/CD pipelines, and local development.

## Quick Start

### Using Pre-built Images

The easiest way to use rook with Docker is to pull the pre-built image from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/ShaileshRawat1403/rook:latest

# Run rook CLI
docker run --rm ghcr.io/ShaileshRawat1403/rook:latest --version

# Run with LLM configuration
docker run --rm \
  -e GOOSE_PROVIDER=openai \
  -e GOOSE_MODEL=gpt-4o \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  ghcr.io/ShaileshRawat1403/rook:latest run -t "Hello, world!"
```

## Building from Source

### Prerequisites

- Docker 20.10 or later
- Docker Buildx (for multi-platform builds)
- Git

### Build the Image

1. Clone the repository:
```bash
git clone https://github.com/ShaileshRawat1403/rook.git
cd goose
```

2. Build the Docker image:
```bash
docker build -t rook:local .
```

The build process:
- Uses a multi-stage build to minimize final image size
- Compiles with optimizations (LTO, stripping, size optimization)
- Results in a ~340MB image containing the `goose` CLI binary

### Build Options

For a development build with debug symbols:
```bash
docker build --build-arg CARGO_PROFILE_RELEASE_STRIP=false -t rook:dev .
```

For multi-platform builds:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t rook:multi .
```

## Running rook in Docker

### CLI Mode

Basic usage:
```bash
# Show help
docker run --rm rook:local --help

# Run a command
docker run --rm \
  -e GOOSE_PROVIDER=openai \
  -e GOOSE_MODEL=gpt-4o \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  rook:local run -t "Explain Docker containers"
```

With volume mounts for file access:
```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  -e GOOSE_PROVIDER=openai \
  -e GOOSE_MODEL=gpt-4o \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  rook:local run -t "Analyze the code in this directory"
```

Interactive session mode with Databricks:
```bash
docker run -it --rm \
  -e GOOSE_PROVIDER=databricks \
  -e GOOSE_MODEL=databricks-dbrx-instruct \
  -e DATABRICKS_HOST="$DATABRICKS_HOST" \
  -e DATABRICKS_TOKEN="$DATABRICKS_TOKEN" \
  rook:local session
```



### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  rook:
    image: ghcr.io/ShaileshRawat1403/rook:latest
    environment:
      - GOOSE_PROVIDER=${GOOSE_PROVIDER:-openai}
      - GOOSE_MODEL=${GOOSE_MODEL:-gpt-4o}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./workspace:/workspace
      - rook-config:/home/rook/.config/goose
    working_dir: /workspace
    stdin_open: true
    tty: true

volumes:
  rook-config:
```

Run with:
```bash
docker-compose run --rm rook session
```

## Configuration

### Environment Variables

The Docker image accepts all standard rook environment variables:

- `GOOSE_PROVIDER`: LLM provider (openai, anthropic, google, etc.)
- `GOOSE_MODEL`: Model to use (gpt-4o, claude-sonnet-4, etc.)
- Provider-specific API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)

### Persistent Configuration

Mount the configuration directory to persist settings:
```bash
docker run --rm \
  -v ~/.config/goose:/home/rook/.config/goose \
  rook:local configure
```

### Installing Additional Tools

The image runs as a non-root user by default. To install additional packages:

```bash
# Run as root to install packages
docker run --rm \
  -u root \
  --entrypoint bash \
  rook:local \
  -c "apt-get update && apt-get install -y vim && rook --version"

# Or create a custom Dockerfile
FROM ghcr.io/ShaileshRawat1403/rook:latest
USER root
RUN apt-get update && apt-get install -y \
    vim \
    tmux \
    && rm -rf /var/lib/apt/lists/*
USER goose
```

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/ShaileshRawat1403/rook:latest
      env:
        GOOSE_PROVIDER: openai
        GOOSE_MODEL: gpt-4o
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - name: Run rook analysis
        run: |
          rook run -t "Review this codebase for security issues"
```

### GitLab CI

```yaml
analyze:
  image: ghcr.io/ShaileshRawat1403/rook:latest
  variables:
    GOOSE_PROVIDER: openai
    GOOSE_MODEL: gpt-4o
  script:
    - rook run -t "Generate documentation for this project"
```

## Image Details

### Size and Optimization

- **Base image**: Debian Bookworm Slim (minimal runtime dependencies)
- **Final size**: ~340MB
- **Optimizations**: Link-Time Optimization (LTO), binary stripping, size optimization
- **Binary included**: `/usr/local/bin/goose` (32MB)

### Security

- Runs as non-root user `goose` (UID 1000)
- Minimal attack surface with only essential runtime dependencies
- Regular security updates via automated builds

### Included Tools

The image includes essential tools for rook operation:
- `git` - Version control operations
- `curl` - HTTP requests
- `ca-certificates` - SSL/TLS support
- Basic shell utilities

## Troubleshooting

### Permission Issues

If you encounter permission errors when mounting volumes:
```bash
# Ensure the mounted directory is accessible
docker run --rm \
  -v $(pwd):/workspace \
  -u $(id -u):$(id -g) \
  rook:local run -t "List files"
```

### API Key Issues

If API keys aren't being recognized:
1. Ensure environment variables are properly set
2. Check that quotes are handled correctly in your shell
3. Use `docker run --env-file .env` for multiple environment variables

### Network Issues

For accessing local services from within the container:
```bash
# Use host network mode
docker run --rm --network host rook:local
```

## Advanced Usage

### Custom Entrypoint

Override the default entrypoint for debugging:
```bash
docker run --rm -it --entrypoint bash rook:local
```

### Resource Limits

Set memory and CPU limits:
```bash
docker run --rm \
  --memory="2g" \
  --cpus="2" \
  rook:local
```

### Multi-stage Development

For development with hot reload:
```bash
# Mount source code
docker run --rm \
  -v $(pwd):/usr/src/goose \
  -w /usr/src/goose \
  rust:1.82-bookworm \
  cargo watch -x run
```

## Building for Production

For production deployments:

1. Use specific image tags instead of `latest`
2. Use secrets management for API keys
3. Set up logging and monitoring
4. Configure resource limits and auto-scaling

Example production Dockerfile:
```dockerfile
FROM ghcr.io/ShaileshRawat1403/rook:v1.6.0
# Add any additional tools needed for your use case
USER root
RUN apt-get update && apt-get install -y your-tools && rm -rf /var/lib/apt/lists/*
USER goose
```

## Contributing

When contributing Docker-related changes:

1. Test builds on multiple platforms (amd64, arm64)
2. Verify image size remains reasonable
3. Update this documentation
4. Consider CI/CD implications
5. Test with various LLM providers

## Related Documentation

- [goose in Docker Tutorial](documentation/docs/tutorials/goose-in-docker.md) - Step-by-step tutorial
- [Installation Guide](https://goose-docs.ai/docs/getting-started/installation) - All installation methods
- [Configuration Guide](https://goose-docs.ai/docs/guides/config-files) - Detailed configuration options
