#!/bin/bash
#
# start.sh - NoobLab local development launcher
# - Checks platform and installed tools
# - Provisions large assets (doppio vendor tree) from *local committed archives only*
#   (skips if already present and complete => respects bandwidth / time budgets)
# - Builds the project (Maven)
# - Starts an embedded Jetty for immediate use (http://localhost:8080)
#
# Usage:
#   ./start.sh
#   PORT=9090 ./start.sh     # custom port
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "========================================"
echo "NoobLab - Stable startup helper"
echo "========================================"

# --- Platform detection ---
OS_RAW="$(uname -s)"
ARCH_RAW="$(uname -m)"
OS="$(echo "$OS_RAW" | tr '[:upper:]' '[:lower:]')"
ARCH="$ARCH_RAW"

case "$OS" in
  linux*)  PLATFORM="linux" ;;
  darwin*) PLATFORM="macos" ;;
  msys*|mingw*|cygwin*) PLATFORM="windows" ;;
  *)       PLATFORM="$OS" ;;
esac

echo "Platform : $PLATFORM ($OS_RAW $ARCH)"
echo "Shell    : $SHELL"
echo

# --- Tool checks (fail fast with helpful messages) ---
need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command '$1' not found in PATH."
    echo "       Please install it (package manager or https://www.oracle.com/java/ for JDK)."
    exit 1
  fi
}

need_cmd java
need_cmd mvn
need_cmd unzip
need_cmd stat
need_cmd mkdir
need_cmd rm
need_cmd cp

JAVA_VERSION_OUTPUT="$(java -version 2>&1 | head -n 1 || true)"
echo "Java     : $JAVA_VERSION_OUTPUT"

MVN_VERSION_OUTPUT="$(mvn -version 2>&1 | head -n 1 || true)"
echo "Maven    : $MVN_VERSION_OUTPUT"

# Basic JDK sanity (project now builds on 8+; runtime container should be reasonably modern)
if ! java -version 2>&1 | grep -E -q 'version "(1[1-9]|[2-9][0-9])'; then
  echo "NOTE: A JDK >= 11 is strongly recommended (current environment uses 17+ successfully)."
fi

echo

# --- Doppio vendor asset provisioning (the "download work") ---
# We use only files already present in the repository (doppio_home.zip + mini-rt.tar).
# Extraction is skipped entirely when the key artifacts look complete.
VENDOR_DIR="src/main/webapp/doppio/vendor"
RT_JAR="$VENDOR_DIR/java_home/lib/rt.jar"
CLASSES_DIR="$VENDOR_DIR/classes"
MINI_RT_VENDOR="$VENDOR_DIR/mini-rt.tar"

echo "Checking currently installed assets under $VENDOR_DIR (bandwidth-friendly)..."

need_extract=0

# Helper: portable file size
file_size() {
  local f="$1"
  if [ -f "$f" ]; then
    if stat -c%s "$f" >/dev/null 2>&1; then
      stat -c%s "$f"
    else
      stat -f%z "$f"
    fi
  else
    echo 0
  fi
}

# rt.jar is the critical one used at runtime for the legacy (old doppio) Java 6 compile path
if [ ! -f "$RT_JAR" ]; then
  echo "  - rt.jar missing"
  need_extract=1
else
  sz=$(file_size "$RT_JAR")
  # The rt.jar inside the committed zip is ~64 MiB
  if [ "$sz" -lt 50000000 ]; then
    echo "  - rt.jar too small ($sz bytes) - will re-provision"
    need_extract=1
  fi
fi

# classes/ tree used by the in-browser Doppio classpath
if [ ! -d "$CLASSES_DIR" ] || [ -z "$(find "$CLASSES_DIR" -type f 2>/dev/null | head -1)" ]; then
  echo "  - classes/ tree missing or empty"
  need_extract=1
fi

if [ "$need_extract" -eq 1 ]; then
  echo
  echo ">>> Performing one-time asset provisioning from local archives (no network transfer of the 38 MiB+ payload)..."
  mkdir -p "$VENDOR_DIR"

  TMPD="$(mktemp -d 2>/dev/null || mktemp -d -t nooblab)"
  trap 'rm -rf "$TMPD"' EXIT

  # Extract only what we need from the committed zip (vendor/java_home + classes)
  unzip -q -o "src/main/webapp/newdoppio/doppio_home.zip" \
    'vendor/java_home/*' 'classes/*' -d "$TMPD" || true

  # java_home
  if [ -d "$TMPD/vendor/java_home" ]; then
    rm -rf "$VENDOR_DIR/java_home"
    mv "$TMPD/vendor/java_home" "$VENDOR_DIR/"
    echo "    + installed java_home/"
  fi

  # classes (for Doppio browser FS + bootclasspath needs)
  if [ -d "$TMPD/classes" ]; then
    rm -rf "$VENDOR_DIR/classes"
    mv "$TMPD/classes" "$VENDOR_DIR/"
    echo "    + installed classes/"
  fi

  # Ensure a copy of mini-rt.tar is also under vendor/ for a couple of legacy browser code paths
  if [ -f "src/main/webapp/doppio/browser/mini-rt.tar" ]; then
    cp -f "src/main/webapp/doppio/browser/mini-rt.tar" "$MINI_RT_VENDOR"
    echo "    + installed mini-rt.tar (under vendor)"
  fi

  rm -rf "$TMPD"
  trap - EXIT

  echo ">>> Asset provisioning finished."
else
  echo ">>> Assets look complete - skipping extraction (saves bandwidth + time)."
fi

# Make sure the small supporting JS files for the legacy doppio standalone demo exist
# (these are committed; this is just a belt-and-suspenders check)
for f in _.js gLong.js jquery.console.js; do
  if [ ! -s "$VENDOR_DIR/$f" ]; then
    echo "WARNING: $VENDOR_DIR/$f is missing or empty."
    echo "         The /doppio/index.jsp legacy demo page may not work fully."
    echo "         Main NoobLab functionality does not depend on it."
  fi
done

echo
# Ensure a working data directory exists for this dev run (the web.xml default is /tmp/nooblab-data)
mkdir -p /tmp/nooblab-data
echo "Data directory ready at /tmp/nooblab-data (override via web.xml datadir param if needed)."

echo
echo "=========================================="
echo "Building NoobLab (mvn package)..."
echo "=========================================="

# Use a reasonably modern reactor; clean is cheap and guarantees stability.
# The project produces a large WAR (~90+ MiB) because of the vendored Doppio Java runtime assets.
# We ensure sufficient heap both via .mvn/jvm.config (for IDE/direct mvn) and here.
export MAVEN_OPTS="-Xmx2g ${MAVEN_OPTS:-}"
mvn -B --no-transfer-progress clean package -DskipTests

echo
echo "Build OK. Target: target/NoobLab.war"
echo

# --- Launch ---
PORT="${PORT:-8080}"
echo "=========================================="
echo "NoobLab ready (Jetty on port $PORT)"
echo "  GUI: http://localhost:$PORT/          (will land on login with 'pretend' auth)"
echo "  Quick tests while running:"
echo "    curl -I http://localhost:$PORT/login.jsp"
echo "    curl -X POST -d 'userID=student&password=any' http://localhost:$PORT/Login"
echo "    curl -X POST -d 'code=print(\"TUI+GUI+Python OK via Skulpt\")' http://localhost:$PORT/RunPython"
echo "  (Java editor + graphics work in the browser UI once you load lesson content)"
echo "Ctrl-C to stop."
echo "=========================================="
echo

# jetty:run serves directly out of src/main/webapp (fast dev loop)
# The plugin is declared in pom.xml so first run will materialize it from Maven Central (tiny).
export MAVEN_OPTS="-Xmx2g ${MAVEN_OPTS:-}"
exec mvn -B jetty:run -Djetty.port="$PORT" -Djetty.host=0.0.0.0
