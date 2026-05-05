#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LAUNCHER_DIR="$PROJECT_DIR/modules/macos-launcher"
BUILD_DIR="$LAUNCHER_DIR/build"
APP_NAME="CodexRemoteContact Launcher.app"
APP_DIR="$PROJECT_DIR/build/$APP_NAME"
USER_APPS_DIR="$HOME/Applications"
USER_APP_DIR="$USER_APPS_DIR/$APP_NAME"
OLD_APP_DIR="$PROJECT_DIR/build/CodexRemoteContactLauncher.app"
OLD_USER_APP_DIR="$USER_APPS_DIR/CodexRemoteContactLauncher.app"
OLD_LOWER_APP_DIR="$PROJECT_DIR/build/CodexRemoteContact Launcher.app"
OLD_LOWER_USER_APP_DIR="$USER_APPS_DIR/CodexRemoteContact Launcher.app"
ICON_SOURCE="$PROJECT_DIR/icon.png"
ROUNDED_ICON="$BUILD_DIR/AppIconRounded.png"
ICONSET="$BUILD_DIR/AppIcon.iconset"

/usr/bin/pkill -x CodexRemoteContactLauncher >/dev/null 2>&1 || true
rm -rf "$BUILD_DIR" "$APP_DIR" "$OLD_APP_DIR" "$OLD_USER_APP_DIR" "$OLD_LOWER_APP_DIR" "$OLD_LOWER_USER_APP_DIR"
mkdir -p "$BUILD_DIR" "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources" "$USER_APPS_DIR"

/usr/bin/swiftc "$LAUNCHER_DIR/Sources/CodexRemoteContactLauncher.swift" \
  -parse-as-library \
  -O \
  -framework AppKit \
  -o "$APP_DIR/Contents/MacOS/CodexRemoteContactLauncher"

cp "$LAUNCHER_DIR/Info.plist" "$APP_DIR/Contents/Info.plist"
printf '%s\n' "$PROJECT_DIR" > "$APP_DIR/Contents/Resources/ProjectDir.txt"

if [ -f "$ICON_SOURCE" ]; then
  /usr/bin/swift "$LAUNCHER_DIR/Sources/RoundIcon.swift" "$ICON_SOURCE" "$ROUNDED_ICON" 1024
  mkdir -p "$ICONSET"
  for size in 16 32 128 256 512; do
    /usr/bin/sips -z "$size" "$size" "$ROUNDED_ICON" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
    double=$((size * 2))
    /usr/bin/sips -z "$double" "$double" "$ROUNDED_ICON" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
  done
  /usr/bin/iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
fi

/usr/bin/codesign --force --deep --sign - "$APP_DIR" >/dev/null
rm -rf "$USER_APP_DIR"
cp -R "$APP_DIR" "$USER_APP_DIR"

echo "$APP_DIR"
echo "$USER_APP_DIR"
