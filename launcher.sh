#!/usr/bin/env bash

# ==============================================================================
# Esplant Financial Tracker - Local Launcher (PostgreSQL & DuckDB Enabled)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR" || exit 1

echo "======================================================"
echo " 🌱 Starting Esplant Financial Tracker..."
echo "======================================================"

# 1. Start PostgreSQL Service if Homebrew is available
if command -v brew >/dev/null 2>&1; then
  echo "🔍 Checking PostgreSQL service..."
  brew services start postgresql@16 >/dev/null 2>&1 || brew services start postgresql >/dev/null 2>&1 || true
fi

# 2. Prepare & Start Backend (FastAPI on Port 8001)
echo "⚡ Preparing Backend (FastAPI)..."
cd "$ROOT_DIR/backend" || exit 1

if [ ! -d ".venv" ]; then
  echo "📦 Creating Python virtual environment (.venv)..."
  if command -v uv >/dev/null 2>&1; then
    uv venv .venv
  else
    python3 -m venv .venv
  fi
fi

# Activate Virtual Environment
source .venv/bin/activate

echo "🚀 Launching FastAPI Backend on http://localhost:8001..."
uvicorn server:app --host 0.0.0.0 --port 8001 > "$ROOT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# 3. Prepare & Start Frontend (Vite on Port 3000)
echo "⚡ Preparing Frontend (Vite React)..."
cd "$ROOT_DIR/frontend" || exit 1

if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node dependencies..."
  npm install
fi

echo "🚀 Launching Vite Frontend on http://localhost:3000..."
npm run dev -- --port 3000 > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Cleanup trap on Ctrl+C / SIGINT
cleanup() {
  echo ""
  echo "🛑 Stopping Esplant Financial Tracker..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "✅ Application stopped cleanly."
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Wait for Frontend to be ready, then open browser
echo "⏳ Waiting for servers to initialize..."
for i in {1..30}; do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo "🎉 Esplant Financial Tracker is live at http://localhost:3000"
    echo "📱 Opening browser..."
    open "http://localhost:3000" 2>/dev/null || true
    break
  fi
  sleep 1
done

echo "------------------------------------------------------"
echo "Press Ctrl+C to stop all services."
echo "------------------------------------------------------"

# Keep script running to maintain child processes
wait $FRONTEND_PID $BACKEND_PID
