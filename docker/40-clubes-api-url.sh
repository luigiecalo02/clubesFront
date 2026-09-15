#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-${API_URL:-http://127.0.0.1:8000}}"
API_URL="${API_URL%/}"
CLUB_ID="${VITE_CLUB_ID:-${CLUB_ID:-}}"

{
  printf 'window.__CLUBES_API_URL__ = "%s";\n' "$API_URL"
  if [ -n "$CLUB_ID" ]; then
    printf 'window.__CLUBES_ROOT_ID__ = "%s";\n' "$CLUB_ID"
  fi
} > /usr/share/nginx/html/config.js
