#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$PROJECT_DIR/config/local.codexremotecontact.chat-hub.plist"
PORT="3789"
USER_DOMAIN="gui/$(id -u)"

cd "$PROJECT_DIR" || exit 1

if [ ! -f "$PLIST" ]; then
  "$PROJECT_DIR/modules/install-launchd-plist.command"
fi

if lsof -tiTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "codexremotecontact Chat Hub is already running:"
  echo "http://localhost:$PORT"
  exit 0
fi

launchctl bootout "$USER_DOMAIN" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "$USER_DOMAIN" "$PLIST"
sleep 1

if lsof -tiTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "codexremotecontact Chat Hub started:"
  echo "http://localhost:$PORT"
else
  echo "codexremotecontact Chat Hub did not start. Check:"
    echo "$PROJECT_DIR/runtime/logs/chat-hub.err.log"
  exit 1
fi
