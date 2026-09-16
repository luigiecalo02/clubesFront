#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-${API_URL:-http://127.0.0.1:8000}}"
API_URL="${API_URL%/}"
CLUB_ID="${VITE_CLUB_ID:-${CLUB_ID:-}}"
CLUB_HOSTS="${VITE_CLUB_HOSTS:-${CLUB_HOSTS:-}}"

js_escape() {
  printf '%s' "$1" | tr '\n\r' '  ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

{
  printf 'window.__CLUBES_API_URL__ = "%s";\n' "$(js_escape "$API_URL")"
  if [ -n "$CLUB_ID" ]; then
    printf 'window.__CLUBES_ROOT_ID__ = "%s";\n' "$(js_escape "$CLUB_ID")"
  fi
  if [ -n "$CLUB_HOSTS" ]; then
    printf 'window.__CLUBES_HOSTS__ = "%s";\n' "$(js_escape "$CLUB_HOSTS")"
  fi
} > /usr/share/nginx/html/config.js
