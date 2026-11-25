#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | tr -d '\r\n' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_url="$(escape_js "${VITE_API_URL:-}")"
ws_url="$(escape_js "${VITE_WS_URL:-}")"
telegram_bot_username="$(escape_js "${VITE_TELEGRAM_BOT_USERNAME:-}")"
apple_client_id="$(escape_js "${VITE_APPLE_CLIENT_ID:-}")"
apple_redirect_uri="$(escape_js "${VITE_APPLE_REDIRECT_URI:-}")"
vk_client_id="$(escape_js "${VITE_VK_CLIENT_ID:-}")"
vk_redirect_uri="$(escape_js "${VITE_VK_REDIRECT_URI:-}")"

cat <<EOF >/usr/share/nginx/html/env-config.js
window.__PAWLANDS_ENV__ = {
  VITE_API_URL: "${api_url}",
  VITE_WS_URL: "${ws_url}",
  VITE_TELEGRAM_BOT_USERNAME: "${telegram_bot_username}",
  VITE_APPLE_CLIENT_ID: "${apple_client_id}",
  VITE_APPLE_REDIRECT_URI: "${apple_redirect_uri}",
  VITE_VK_CLIENT_ID: "${vk_client_id}",
  VITE_VK_REDIRECT_URI: "${vk_redirect_uri}"
};
EOF
