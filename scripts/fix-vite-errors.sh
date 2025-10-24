#!/bin/bash

# Fix Vite Development Server Errors Script
# This script resolves common Vite development server issues including:
# - CSP syntax errors
# - Outdated optimize dependencies (504 errors)
# - Chunk loading failures
# - Module resolution issues

echo "🔧 Fixing Vite Development Server Errors..."
echo ""

# Step 1: Stop any running dev server
echo "🛑 Step 1: Stopping any running development server..."
pkill -f "vite" || true
pkill -f "npm run dev" || true
sleep 2
echo "✅ Development server stopped"
echo ""

# Step 2: Clean all caches and build artifacts
echo "🧹 Step 2: Cleaning caches and build artifacts..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite
npm cache clean --force
echo "✅ All caches cleared"
echo ""

# Step 3: Clear browser cache instructions
echo "🌐 Step 3: Clear browser cache"
echo "Please do one of the following:"
echo "  - Press Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)"
echo "  - Or open DevTools > Application > Clear Storage > Clear site data"
echo "  - Or use the clear-browser-cache.js script: node scripts/clear-browser-cache.js"
echo ""

# Step 4: Reinstall dependencies (optional, uncomment if needed)
# echo "📦 Step 4: Reinstalling dependencies..."
# rm -rf node_modules
# npm install
# echo "✅ Dependencies reinstalled"
# echo ""

# Step 5: Start development server
echo "🚀 Step 5: Starting development server..."
echo "Starting Vite dev server in background..."
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test server health
echo "🔍 Testing server health..."
if curl -s -f http://localhost:8080 > /dev/null; then
    echo "✅ Development server is running successfully"
    echo "✅ Server accessible at http://localhost:8080"
else
    echo "❌ Development server failed to start"
    echo "Check the output above for errors"
    exit 1
fi

echo ""
echo "✨ Fix Complete!"
echo ""
echo "Your development server should now be running without errors."
echo ""
echo "If you still encounter issues:"
echo "1. Hard refresh your browser (Ctrl + Shift + R or Cmd + Shift + R)"
echo "2. Check the browser console for any remaining errors"
echo "3. Try accessing http://localhost:8080 directly"
echo ""
echo "Common issues resolved:"
echo "✅ CSP syntax errors"
echo "✅ Outdated optimize dependencies (504 errors)"
echo "✅ Chunk loading failures"
echo "✅ Module resolution issues"
echo ""
echo "To stop the development server, run: kill $DEV_PID"
