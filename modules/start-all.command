#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HUB_PORT="3789"
PLIST="$PROJECT_DIR/config/local.codexremotecontact.chat-hub.plist"
USER_DOMAIN="gui/$(id -u)"
CLIENT_APP="$PROJECT_DIR/build/CodexRemoteContactClient.app"

cd "$PROJECT_DIR"

if [ ! -f "$PLIST" ]; then
  "$PROJECT_DIR/modules/install-launchd-plist.command"
fi

if lsof -tiTCP:$HUB_PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "codexremotecontact Chat Hub is already running:"
  echo "http://localhost:$HUB_PORT"
else
  echo "Starting codexremotecontact Chat Hub..."
  launchctl bootout "$USER_DOMAIN" "$PLIST" >/dev/null 2>&1 || true
  launchctl bootstrap "$USER_DOMAIN" "$PLIST"
  sleep 1
  if lsof -tiTCP:$HUB_PORT -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Chat Hub started:"
    echo "http://localhost:$HUB_PORT"
  else
    echo "Chat Hub did not start. Check:"
    echo "$PROJECT_DIR/chat-hub.err.log"
    exit 1
  fi
fi

if [ -d "$CLIENT_APP" ]; then
  echo "Opening codexremotecontact client..."
  /usr/bin/open -a "$CLIENT_APP"
else
  echo "Client app is not built yet: $CLIENT_APP"
fi

echo ""
echo "LLBot is not started by this script. Open it manually when QQ login is needed."
