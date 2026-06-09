#!/bin/bash

# Navigate to backend directory (assumes script is in application/backend/)
cd "$(dirname "$0")" || exit 1

# Check if virtual environment exists, if not create it
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies only when explicitly requested.
# Usage: INSTALL_DEPS=1 ./start_backend.sh
if [ "${INSTALL_DEPS:-0}" = "1" ] && [ -f "requirements.txt" ]; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Apply Alembic migrations only when explicitly requested.
# Existing databases that predate Alembic should be stamped once first:
#   ./run_migrations.sh stamp head
# Usage: RUN_MIGRATIONS=1 ./start_backend.sh
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    echo "Applying Alembic migrations..."
    python3 -m alembic upgrade head
fi

# Start the backend server
# Avoid --reload because file watchers can fail in restricted environments.
echo "Starting Home4U Backend Server on http://127.0.0.1:8000 ..."
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
