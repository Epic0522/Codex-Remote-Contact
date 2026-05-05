#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$ROOT/../.." && pwd)"
APP_ROOT="$PROJECT_DIR/build/CodexRemoteContactClient.app"
CONTENTS="$APP_ROOT/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"
BINARY="$MACOS/CodexRemoteContactClient"

mkdir -p "$MACOS" "$RESOURCES"

if pgrep -x CodexRemoteContactClient >/dev/null 2>&1; then
  pkill -x CodexRemoteContactClient || true
  sleep 0.2
fi

xcrun swiftc \
  -framework Cocoa \
  -framework WebKit \
  -o "$BINARY" \
  "$ROOT/Sources/CodexRemoteContactClient.swift"

cp "$ROOT/Resources/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/Resources/client.html" "$RESOURCES/client.html"
cp "$ROOT/Resources/client.css" "$RESOURCES/client.css"
cp "$ROOT/Resources/client.js" "$RESOURCES/client.js"
cp "$ROOT/Resources/client.html" "$PROJECT_DIR/modules/web-console/public/client.html"
cp "$ROOT/Resources/client.css" "$PROJECT_DIR/modules/web-console/public/client.css"
cp "$ROOT/Resources/client.js" "$PROJECT_DIR/modules/web-console/public/client.js"

chmod +x "$BINARY"

if [[ "${1:-}" == "--verify" ]]; then
  /usr/bin/open -n "$APP_ROOT"
  sleep 1
  if pgrep -x CodexRemoteContactClient >/dev/null 2>&1; then
    echo "CodexRemoteContactClient is running: $APP_ROOT"
  else
    echo "CodexRemoteContactClient did not stay running" >&2
    exit 1
  fi
elif [[ "${1:-}" == "--build-only" ]]; then
  echo "Built $APP_ROOT"
else
  /usr/bin/open -n "$APP_ROOT"
fi
