#!/bin/bash

# Navigate to frontend directory (assumes script is in application/frontend/)
cd "$(dirname "$0")" || exit 1

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the frontend development server
echo "Starting Home4U Frontend Development Server on http://127.0.0.1:5173 ..."
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
