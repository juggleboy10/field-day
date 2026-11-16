#!/usr/bin/env bash
# Builds index.html from src/ (see tools/build.py).
# Usage: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
exec python3 tools/build.py
