#!/bin/bash
# Warmup script for Hisab Pro dev server
# Pre-compiles all routes to avoid OOM during user requests

echo "Starting dev server..."
cd /home/z/my-project

node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000 --webpack > /tmp/next-dev.log 2>&1 &
MAIN_PID=$!
echo "Server PID: $MAIN_PID"

# Wait for server to be ready
for i in $(seq 1 30); do
  sleep 2
  if curl -s --max-time 5 http://localhost:3000/ -o /dev/null 2>/dev/null; then
    echo "Server is ready!"
    break
  fi
  echo "Waiting for server... ($i)"
done

# Pre-compile all pages
echo "Pre-compiling pages..."
curl -s --max-time 60 http://localhost:3000/ -o /dev/null && echo "  root ✓" || echo "  root ✗"
curl -s --max-time 120 http://localhost:3000/login -o /dev/null && echo "  login ✓" || echo "  login ✗"
curl -s --max-time 120 http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@hisabpro.com","password":"password123"}' -o /dev/null && echo "  login-api ✓" || echo "  login-api ✗"
curl -s --max-time 120 http://localhost:3000/api/auth/session -H 'x-session-token: cmp17vjzt0000m2x0dgni7f4g' -o /dev/null && echo "  session-api ✓" || echo "  session-api ✗"
curl -s --max-time 120 http://localhost:3000/api/auth/logout -X POST -o /dev/null && echo "  logout-api ✓" || echo "  logout-api ✗"
curl -s --max-time 120 http://localhost:3000/dashboard -o /dev/null && echo "  dashboard ✓" || echo "  dashboard ✗"
curl -s --max-time 120 http://localhost:3000/api/dashboard -H 'x-session-token: cmp17vjzt0000m2x0dgni7f4g' -o /dev/null && echo "  dashboard-api ✓" || echo "  dashboard-api ✗"

echo ""
echo "Warmup complete! Server is ready at http://localhost:3000"
echo "Memory usage:"
free -m
