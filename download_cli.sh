#!/usr/bin/env bash
set -eu

##############################################################################
# rook CLI Install Script
#
# This script downloads the latest stable 'rook' CLI binary from GitHub releases
# and installs it to your system.
#
# Supported OS: macOS (darwin), Linux, Windows (MSYS2/Git Bash/WSL)
# Supported Architectures: x86_64, arm64
#
# Usage:
#   curl -fsSL https://github.com/ShaileshRawat1403/rook/releases/download/stable/download_cli.sh | bash
#
# Environment variables:
#   ROOK_BIN_DIR   - Directory to which rook will be installed (default: $HOME/.local/bin)
#   ROOK_VERSION   - Optional: specific version to install (e.g., "v1.0.25"). Overrides CANARY. Can be in the format vX.Y.Z, vX.Y.Z-suffix, or X.Y.Z
#   ROOK_PROVIDER  - Optional: provider for rook
#   ROOK_MODEL     - Optional: model for rook
#   ROOK_*        - Legacy aliases still accepted for compatibility
#   CANARY         - Optional: if set to "true", downloads from canary release instead of stable
#   CONFIGURE      - Optional: if set to "false", disables running rook configure interactively
#   ** other provider specific environment variables (eg. DATABRICKS_HOST)
##############################################################################

# --- 1) Check for dependencies ---
# Check for curl
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: 'curl' is required to download rook. Please install curl and try again."
  exit 1
fi

# Check for tar or unzip (depending on OS)
if ! command -v tar >/dev/null 2>&1 && ! command -v unzip >/dev/null 2>&1; then
  echo "Error: Either 'tar' or 'unzip' is required to extract rook. Please install one and try again."
  exit 1
fi

# Check for required extraction tools based on detected OS
if [ "${OS:-}" = "windows" ]; then
  # Windows uses PowerShell's built-in Expand-Archive - check if PowerShell is available
  if ! command -v powershell.exe >/dev/null 2>&1 && ! command -v pwsh >/dev/null 2>&1; then
    echo "Warning: PowerShell is recommended to extract Windows packages but was not found."
    echo "Falling back to unzip if available."
  fi
else
  if ! command -v tar >/dev/null 2>&1; then
    echo "Error: 'tar' is required to extract packages for ${OS:-unknown}. Please install tar and try again."
    exit 1
  fi
fi


# --- 2) Variables ---
REPO="ShaileshRawat1403/rook"
OUT_FILE="rook"

# Set default bin directory based on detected OS environment
if [[ "${WINDIR:-}" ]] || [[ "${windir:-}" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Native Windows environments - use Windows user profile path
    DEFAULT_BIN_DIR="$USERPROFILE/rook"
elif [[ -f "/proc/version" ]] && grep -q "Microsoft\|WSL" /proc/version 2>/dev/null; then
    # WSL - use Linux-style path but make sure it exists
    DEFAULT_BIN_DIR="$HOME/.local/bin"
elif [[ "$PWD" =~ ^/mnt/[a-zA-Z]/ ]]; then
    # WSL mount point detection
    DEFAULT_BIN_DIR="$HOME/.local/bin"
else
    # Default for Linux/macOS
    DEFAULT_BIN_DIR="$HOME/.local/bin"
fi

ROOK_BIN_DIR="${ROOK_BIN_DIR:-${ROOK_BIN_DIR:-$DEFAULT_BIN_DIR}}"
RELEASE="${CANARY:-false}"
CONFIGURE="${CONFIGURE:-true}"
if [ -n "${ROOK_VERSION:-${ROOK_VERSION:-}}" ]; then
  ROOK_VERSION="${ROOK_VERSION:-${ROOK_VERSION:-}}"
  # Validate the version format
  if [[ ! "$ROOK_VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
    echo "[error]: invalid version '$ROOK_VERSION'."
    echo "  expected: semver format vX.Y.Z, vX.Y.Z-suffix, or X.Y.Z"
    exit 1
  fi
  ROOK_VERSION=$(echo "$ROOK_VERSION" | sed 's/^v\{0,1\}/v/') # Ensure the version string is prefixed with 'v' if not already present
  RELEASE_TAG="$ROOK_VERSION"
else
  # If no explicit version is set, fall back to canary/stable selection.
  RELEASE_TAG="$([[ "$RELEASE" == "true" ]] && echo "canary" || echo "stable")"
fi

# --- 3) Detect OS/Architecture ---
# Allow explicit override for automation or when auto-detection is wrong:
#   INSTALL_OS=linux|windows|darwin
if [ -n "${INSTALL_OS:-}" ]; then
  case "${INSTALL_OS}" in
    linux|windows|darwin) OS="${INSTALL_OS}" ;;
    *) echo "[error]: unsupported INSTALL_OS='${INSTALL_OS}' (expected: linux|windows|darwin)"; exit 1 ;;
  esac
else
  # Better OS detection for Windows environments, with safer WSL handling.
  # If explicit Windows-like shells/variables are present (MSYS/Cygwin), treat as windows.
  if [[ "${WINDIR:-}" ]] || [[ "${windir:-}" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
  elif [[ -f "/proc/version" ]] && grep -q "Microsoft\|WSL" /proc/version 2>/dev/null; then
    # WSL detected. Prefer Linux unless there are clear signs we should install the Windows build:
    # - running on a Windows-mounted path like /mnt/c/...   OR
    # - Windows executables are available AND we're on a Windows mount
    if [[ "$PWD" =~ ^/mnt/[a-zA-Z]/ ]]; then
      OS="windows"
    else
      # If powershell/cmd exist, only treat as Windows when in a Windows mount
      if command -v powershell.exe >/dev/null 2>&1 || command -v cmd.exe >/dev/null 2>&1; then
        if [[ "$PWD" =~ ^/mnt/[a-zA-Z]/ ]] || [[ -d "/c" || -d "/d" || -d "/e" ]]; then
          OS="windows"
        else
          OS="linux"
        fi
      else
        # No strong Windows interop present — install Linux build inside WSL by default
        OS="linux"
      fi
    fi
  elif [[ "$PWD" =~ ^/mnt/[a-zA-Z]/ ]]; then
    # WSL mount point detection (like /mnt/c/) outside of /proc/version check
    OS="windows"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="darwin"
  elif command -v powershell.exe >/dev/null 2>&1 || command -v cmd.exe >/dev/null 2>&1; then
    # Presence of Windows executables (likely a Windows environment)
    OS="windows"
  elif [[ "$PWD" =~ ^/[a-zA-Z]/ ]] && [[ -d "/c" || -d "/d" || -d "/e" ]]; then
    # Check for Windows-style mount points (like in Git Bash)
    OS="windows"
  else
    # Fallback to uname for other systems
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  fi
fi

ARCH=$(uname -m)

# Handle Windows environments (MSYS2, Git Bash, Cygwin, WSL)
case "$OS" in
  linux|darwin|windows) ;;
  mingw*|msys*|cygwin*)
    OS="windows"
    ;;
  *)
    echo "Error: Unsupported OS '$OS'. rook currently supports Linux, macOS, and Windows."
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64)
    ARCH="x86_64"
    ;;
  arm64|aarch64)
    # Some systems use 'arm64' and some 'aarch64' – standardize to 'aarch64'
    ARCH="aarch64"
    ;;
  *)
    echo "Error: Unsupported architecture '$ARCH'."
    exit 1
    ;;
esac

# Debug output (safely handle undefined variables)
echo "WINDIR: ${WINDIR:-<not set>}"
echo "OSTYPE: $OSTYPE"
echo "uname -s: $(uname -s)"
echo "uname -m: $(uname -m)"
echo "PWD: $PWD"

# Output the detected OS
echo "Detected OS: $OS with ARCH $ARCH"

# Build the filename and URL for the stable release
if [ "$OS" = "darwin" ]; then
  FILE="rook-$ARCH-apple-darwin.tar.bz2"
  EXTRACT_CMD="tar"
elif [ "$OS" = "windows" ]; then
  # Windows only supports x86_64 currently
  if [ "$ARCH" != "x86_64" ]; then
    echo "Error: Windows currently only supports x86_64 architecture."
    exit 1
  fi
  FILE="rook-$ARCH-pc-windows-msvc.zip"
  EXTRACT_CMD="unzip"
  OUT_FILE="rook.exe"
else
  FILE="rook-$ARCH-unknown-linux-gnu.tar.bz2"
  EXTRACT_CMD="tar"
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$RELEASE_TAG/$FILE"

# --- 4) Download & extract 'rook' binary ---
echo "Downloading $RELEASE_TAG release: $FILE..."
if ! curl -sLf "$DOWNLOAD_URL" --output "$FILE"; then
  # If the download fails, only fall back to latest stable when no version was specified and canary was not requested).
  if ! [ -n "${ROOK_VERSION:-}" ] && [ "${CANARY:-false}" != "true" ]; then
    LATEST_TAG=$(curl -s https://api.github.com/repos/ShaileshRawat1403/rook/releases/latest | \
      grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$LATEST_TAG" ]; then
      echo "Error: Failed to download $DOWNLOAD_URL and latest tag unavailable"
      exit 1
    fi

    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$FILE"
    if curl -sLf "$DOWNLOAD_URL" --output "$FILE"; then
      # Fallback succeeded
      :
    else
      echo "Error: Failed to download from fallback url $DOWNLOAD_URL using latest tag $LATEST_TAG"
      exit 1
    fi
  else
    echo "Error: Failed to download $DOWNLOAD_URL"
    exit 1
  fi
fi

# Create a temporary directory for extraction
TMP_DIR="/tmp/rook_install_$RANDOM"
if ! mkdir -p "$TMP_DIR"; then
  echo "Error: Could not create temporary extraction directory"
  exit 1
fi
# Clean up temporary directory
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Extracting $FILE to temporary directory..."
set +e  # Disable immediate exit on error

if [ "$EXTRACT_CMD" = "tar" ]; then
  tar -xjf "$FILE" -C "$TMP_DIR" 2> tar_error.log
  extract_exit_code=$?

  # Check for tar errors
  if [ $extract_exit_code -ne 0 ]; then
    if grep -iEq "missing.*bzip2|bzip2.*missing|bzip2.*No such file|No such file.*bzip2" tar_error.log; then
      echo "Error: Failed to extract $FILE. 'bzip2' is required but not installed. See details below:"
    else
      echo "Error: Failed to extract $FILE. See details below:"
    fi
    cat tar_error.log
    rm tar_error.log
    exit 1
  fi
  rm tar_error.log
else
  # Use unzip for Windows
  unzip -q "$FILE" -d "$TMP_DIR" 2> unzip_error.log
  extract_exit_code=$?

  # Check for unzip errors
  if [ $extract_exit_code -ne 0 ]; then
    echo "Error: Failed to extract $FILE. See details below:"
    cat unzip_error.log
    rm unzip_error.log
    exit 1
  fi
  rm unzip_error.log
fi

set -e  # Re-enable immediate exit on error

rm "$FILE" # clean up the downloaded archive

# Determine the extraction directory (handle subdirectory in Windows packages)
# Windows releases may contain files in a 'rook-package' subdirectory
EXTRACT_DIR="$TMP_DIR"
if [ "$OS" = "windows" ] && [ -d "$TMP_DIR/rook-package" ]; then
  echo "Found rook-package subdirectory, using that as extraction directory"
  EXTRACT_DIR="$TMP_DIR/rook-package"
fi

# Make binary executable
if [ "$OS" = "windows" ]; then
  chmod +x "$EXTRACT_DIR/rook.exe"
else
  chmod +x "$EXTRACT_DIR/rook"
fi

# --- 5) Install to $ROOK_BIN_DIR ---
if [ ! -d "$ROOK_BIN_DIR" ]; then
  echo "Creating directory: $ROOK_BIN_DIR"
  mkdir -p "$ROOK_BIN_DIR"
fi

echo "Moving rook to $ROOK_BIN_DIR/$OUT_FILE"
if [ "$OS" = "windows" ]; then
  mv "$EXTRACT_DIR/rook.exe" "$ROOK_BIN_DIR/$OUT_FILE"
else
  # On Linux, if the target binary is currently running, writing to it fails
  # with ETXTBSY ("Text file busy"). Rename the old binary out of the way
  # first, then move the new one in. If the move fails, restore the old binary
  # so the user is never left without an executable.
  if [ -f "$ROOK_BIN_DIR/$OUT_FILE" ]; then
    mv "$ROOK_BIN_DIR/$OUT_FILE" "$ROOK_BIN_DIR/$OUT_FILE.old"
    if ! mv "$EXTRACT_DIR/rook" "$ROOK_BIN_DIR/$OUT_FILE"; then
      echo "Error: failed to install new binary, restoring previous version"
      mv "$ROOK_BIN_DIR/$OUT_FILE.old" "$ROOK_BIN_DIR/$OUT_FILE"
      exit 1
    fi
    rm -f "$ROOK_BIN_DIR/$OUT_FILE.old"
  else
    mv "$EXTRACT_DIR/rook" "$ROOK_BIN_DIR/$OUT_FILE"
  fi
fi

# Copy Windows runtime DLLs if they exist
if [ "$OS" = "windows" ]; then
  for dll in "$EXTRACT_DIR"/*.dll; do
    if [ -f "$dll" ]; then
      echo "Moving Windows runtime DLL: $(basename "$dll")"
      mv "$dll" "$ROOK_BIN_DIR/"
    fi
  done
fi

# skip configuration for non-interactive installs e.g. automation, docker
if [ "$CONFIGURE" = true ]; then
  # --- 6) Configure rook (Optional) ---
  echo ""
  echo "Configuring rook"
  echo ""
  "$ROOK_BIN_DIR/$OUT_FILE" configure
else
  echo "Skipping 'rook configure', you may need to run this manually later"
fi



# --- 7) Check PATH and give instructions if needed ---
if [[ ":$PATH:" != *":$ROOK_BIN_DIR:"* ]]; then
  echo ""
  echo "Warning: rook installed, but $ROOK_BIN_DIR is not in your PATH."

  if [ "$OS" = "windows" ]; then
    echo "To add rook to your PATH in PowerShell:"
    echo ""
    echo "# Add to your PowerShell profile"
    echo '$profilePath = $PROFILE'
    echo 'if (!(Test-Path $profilePath)) { New-Item -Path $profilePath -ItemType File -Force }'
    echo 'Add-Content -Path $profilePath -Value ''$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"'''
    echo "# Reload profile or restart PowerShell"
    echo '. $PROFILE'
    echo ""
    echo "Alternatively, you can run:"
    echo "    rook configure"
    echo "or rerun this install script after updating your PATH."
  else
    SHELL_NAME=$(basename "$SHELL")

    echo ""
    echo "The \$ROOK_BIN_DIR is not in your PATH."

    if [ "$CONFIGURE" = true ]; then
      echo "What would you like to do?"
      echo "1) Add it for me"
      echo "2) I'll add it myself, show instructions"

      # Check whether stdin is a terminal. If it is not (for example, if
      # this script has been piped into bash), we need to explicitly read user's
      # choice from /dev/tty.
      if [ -t 0 ]; then # terminal
        read -p "Enter choice [1/2]: " choice
      elif [ -r /dev/tty ]; then # not a terminal, but /dev/tty is available
        read -p "Enter choice [1/2]: " choice < /dev/tty
      else # non-interactive environment without /dev/tty
        echo "Non-interactive environment detected without /dev/tty; defaulting to option 2 (show instructions)."
        choice=2
      fi

      case "$choice" in
      1)
        RC_FILE="$HOME/.${SHELL_NAME}rc"
        echo "Adding \$ROOK_BIN_DIR to $RC_FILE..."
        echo "export PATH=\"$ROOK_BIN_DIR:\$PATH\"" >> "$RC_FILE"
        echo "Done! Reload your shell or run 'source $RC_FILE' to apply changes."
        ;;
      2)
        echo ""
        echo "Add it to your PATH by editing ~/.${SHELL_NAME}rc or similar:"
        echo "    export PATH=\"$ROOK_BIN_DIR:\$PATH\""
        echo "Then reload your shell (e.g. 'source ~/.${SHELL_NAME}rc') to apply changes."
        ;;
      *)
        echo "Invalid choice. Please add \$ROOK_BIN_DIR to your PATH manually."
        ;;
      esac
    else
      echo ""
      echo "Configure disabled. Please add \$ROOK_BIN_DIR to your PATH manually."
    fi

  fi

  echo ""
fi
