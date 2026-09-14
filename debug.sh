#!/bin/bash

echo "🔍 Ginem Dev - Diagnostic Check"
echo "=================================="
echo ""

# Check Node version
echo "📦 Environment:"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo ""

# Check ports
echo "📡 Checking ports..."
if lsof -i :3000 2>/dev/null > /dev/null; then
    echo "  ✅ Port 3000 (API) is in use"
else
    echo "  ❌ Port 3000 (API) is NOT in use"
fi

if lsof -i :5173 2>/dev/null > /dev/null; then
    echo "  ✅ Port 5173 (Dashboard) is in use"
else
    echo "  ❌ Port 5173 (Dashboard) is NOT in use"
fi
echo ""

# Check dependencies
echo "📦 Dependencies:"
if [ -d "packages/api/node_modules" ]; then
    echo "  ✅ API node_modules exists"
else
    echo "  ❌ API node_modules missing - run: npm install"
fi

if [ -d "packages/dashboard/node_modules" ]; then
    echo "  ✅ Dashboard node_modules exists"
else
    echo "  ❌ Dashboard node_modules missing - run: npm install"
fi
echo ""

# Check config files
echo "⚙️  Configuration:"
if [ -f "packages/api/.env" ]; then
    echo "  ✅ API .env exists"
else
    echo "  ⚠️  API .env missing - check packages/api/.env"
fi

if [ -f "packages/dashboard/.env" ]; then
    echo "  ✅ Dashboard .env exists"
else
    echo "  ⚠️  Dashboard .env might be missing (optional for dashboard)"
fi
echo ""

# Check processes
echo "🔄 Running processes:"
if pgrep -f "tsx watch server.ts" > /dev/null; then
    echo "  ✅ API is running (tsx)"
else
    echo "  ℹ️  API is not running"
fi

if pgrep -f "vite" > /dev/null; then
    echo "  ✅ Dashboard is running (vite)"
else
    echo "  ℹ️  Dashboard is not running"
fi
echo ""

echo "💡 Quick Fix Steps:"
echo ""
echo "1️⃣  If dependencies are missing:"
echo "   npm install"
echo ""
echo "2️⃣  Run in separate terminals (RECOMMENDED):"
echo "   Terminal 1: npm run dev:api"
echo "   Terminal 2: npm run dev:dashboard"
echo ""
echo "3️⃣  Then access in browser:"
echo "   Dashboard: http://localhost:5173"
echo "   API: http://localhost:3000"
echo ""
echo "4️⃣  If ports are already in use:"
echo "   Kill processes: lsof -i :3000 | grep -v PID | awk '{print \$2}' | xargs kill -9"
echo "                    lsof -i :5173 | grep -v PID | awk '{print \$2}' | xargs kill -9"
echo ""
echo "5️⃣  Check logs for errors:"
echo "   - Look for error messages in your terminal"
echo "   - Check browser console (F12) for JavaScript errors"
echo ""
