#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")" || exit 1

if [ ! -x ".venv/bin/python" ]; then
    echo "Missing backend virtual environment at application/backend/.venv"
    echo "Run ./start_backend.sh once or create the venv before running migrations."
    exit 1
fi

export PYTHONPATH=.

ACTION="${1:-upgrade}"
TARGET="${2:-head}"

case "$ACTION" in
    upgrade)
        .venv/bin/python -m alembic upgrade "$TARGET"
        ;;
    downgrade)
        .venv/bin/python -m alembic downgrade "$TARGET"
        ;;
    current)
        .venv/bin/python -m alembic current
        ;;
    history)
        .venv/bin/python -m alembic history --verbose
        ;;
    stamp)
        .venv/bin/python -m alembic stamp "$TARGET"
        ;;
    *)
        echo "Usage: ./run_migrations.sh [upgrade|downgrade|current|history|stamp] [target]"
        exit 1
        ;;
esac
