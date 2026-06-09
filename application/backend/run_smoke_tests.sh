#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")" || exit 1

if [ ! -x ".venv/bin/python" ]; then
    echo "Missing backend virtual environment at application/backend/.venv"
    echo "Run ./start_backend.sh once or create the venv before running smoke tests."
    exit 1
fi

export PYTHONPATH=.

echo "Running backend smoke tests..."
.venv/bin/python app/tests_api_smoke.py
.venv/bin/python app/tests_search_smoke.py
.venv/bin/python app/tests_workspace_analysis_smoke.py
.venv/bin/python app/tests_analysis_quality_benchmark.py
.venv/bin/python app/tests_auth_rate_limit.py

echo "All backend smoke tests passed."
