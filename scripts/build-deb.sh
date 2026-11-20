#!/usr/bin/env bash
set -euo pipefail

BUILD_DIR="${1:?build dir required}"
DEB="${2:?deb filename required}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

printf '2.0\n' > "$WORK/debian-binary"

mkdir -p "$WORK/ctrl"
cp -a "$BUILD_DIR/DEBIAN/." "$WORK/ctrl/"
cd "$WORK/ctrl"
tar czf "$WORK/control.tar.gz" ./*
cd - >/dev/null

mkdir -p "$WORK/data"
for item in "$BUILD_DIR"/*; do
    base="$(basename "$item")"
    if [[ "$base" != "DEBIAN" ]]; then
        cp -a "$item" "$WORK/data/"
    fi
done
cd "$WORK/data"
tar czf "$WORK/data.tar.gz" ./*
cd - >/dev/null

rm -f "$DEB"
ar rcs "$DEB" "$WORK/debian-binary" "$WORK/control.tar.gz" "$WORK/data.tar.gz"

echo "Built $DEB"
