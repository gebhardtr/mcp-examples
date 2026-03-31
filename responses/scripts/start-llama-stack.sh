#!/bin/sh
set -eu

SECRET_PATH="/run/secrets/openai_api_key"

if [ ! -f "${SECRET_PATH}" ]; then
  echo "Podman secret 'openai_api_key' is required to start the llama-stack service." >&2
  echo "Create it with: printf '%s' 'sk-...' | podman secret create openai_api_key -" >&2
  exit 1
fi

OPENAI_API_KEY="$(tr -d '\r\n' < "${SECRET_PATH}")"
export OPENAI_API_KEY

if [ -z "${OPENAI_API_KEY}" ]; then
  echo "Podman secret 'openai_api_key' exists, but it is empty." >&2
  exit 1
fi

export SQLITE_STORE_DIR="${SQLITE_STORE_DIR:-/app/.llama}"
export FILES_STORAGE_DIR="${FILES_STORAGE_DIR:-/app/.llama/files}"

exec llama stack run starter --port 8321
