#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "Virtual environment not found at $VENV_DIR"
  echo "Create it with: python3 -m venv .venv"
  exit 1
fi

source "$VENV_DIR/bin/activate"

python -m pip install -r "$ROOT_DIR/services/handwriting/requirements.txt" >/dev/null

exec python "$ROOT_DIR/services/handwriting/app.py"
