#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

bot_username="$(escape_js "${VITE_TELEGRAM_BOT_USERNAME:-}")"

cat <<EOF >/usr/share/nginx/html/env-config.js
window.__PAWLANDS_ENV__ = {
  VITE_TELEGRAM_BOT_USERNAME: "${bot_username}"
};
EOF
