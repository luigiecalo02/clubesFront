#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-${API_URL:-http://127.0.0.1:8000}}"
API_URL="${API_URL%/}"

printf 'window.__CLUBES_API_URL__ = "%s";\n' "$API_URL" > /usr/share/nginx/html/config.js
