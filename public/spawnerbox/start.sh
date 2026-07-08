#!/usr/bin/env bash
# Launch the Spawner Box Generator locally (no main server needed).
cd "$(dirname "$0")" || exit 1
exec node serve.mjs "$@"
