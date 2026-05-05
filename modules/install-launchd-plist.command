#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$PROJECT_DIR/config/local.codexremotecontact.chat-hub.plist.example"
TARGET="$PROJECT_DIR/config/local.codexremotecontact.chat-hub.plist"

sed "s#__PROJECT_DIR__#$PROJECT_DIR#g" "$TEMPLATE" > "$TARGET"
echo "Wrote $TARGET"
