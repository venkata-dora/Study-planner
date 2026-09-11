#!/bin/bash

# Day Planner Launcher
APP_DIR="/Users/saisujan/Desktop/every_day_activities"

# Kill any existing instances
lsof -ti:5050 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start Flask backend
cd "$APP_DIR"
/usr/bin/env python3 app.py > /tmp/day-planner-flask.log 2>&1 &
FLASK_PID=$!
echo $FLASK_PID > /tmp/day-planner-flask.pid

# Wait for Flask to be ready
for i in {1..20}; do
  if curl -s http://localhost:5050/api/briefing > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# Start Vite dev server
cd "$APP_DIR"
npm run dev > /tmp/day-planner-vite.log 2>&1 &
VITE_PID=$!
echo $VITE_PID > /tmp/day-planner-vite.pid

# Wait for Vite to be ready
sleep 4

# Get Vite port (might be 5173 or next available)
VITE_PORT=$(grep -oP '(?<=http://localhost:)\d+' /tmp/day-planner-vite.log | head -1)
VITE_PORT=${VITE_PORT:-5173}

# Open in browser
open "http://localhost:$VITE_PORT"
