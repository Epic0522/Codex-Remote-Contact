#!/bin/zsh
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$PROJECT_DIR/config/local.codexremotecontact.chat-hub.plist"
PORT="3789"
USER_DOMAIN="gui/$(id -u)"

launchctl bootout "$USER_DOMAIN" "$PLIST" >/dev/null 2>&1 || true

pid=$(lsof -tiTCP:$PORT -sTCP:LISTEN)

if [ -z "$pid" ]; then
  echo "codexremotecontact Chat Hub is not running."
  exit 0
fi

kill -TERM $pid
echo "Stopped codexremotecontact Chat Hub on port $PORT."
