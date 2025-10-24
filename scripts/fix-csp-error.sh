#!/bin/bash

# Fix CSP Syntax Error Script
# This script helps fix the CSP syntax error by clearing caches and rebuilding

echo "🔧 Fixing CSP Syntax Error..."
echo ""

# Step 1: Clean node_modules and cache
echo "📦 Step 1: Cleaning node_modules and cache..."
rm -rf node_modules/.vite
rm -rf dist
echo "✅ Cache cleared"
echo ""

# Step 2: Clear browser cache instructions
echo "🌐 Step 2: Clear browser cache"
echo "Please do one of the following:"
echo "  - Press Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)"
echo "  - Or open DevTools > Application > Clear Storage > Clear site data"
echo ""

# Step 3: Rebuild
echo "🏗️  Step 3: Rebuilding application..."
npm run build
echo "✅ Build complete"
echo ""

# Step 4: Instructions
echo "✨ Fix Complete!"
echo ""
echo "Next steps:"
echo "1. Restart your development server (npm run dev)"
echo "2. Hard refresh your browser (Ctrl + Shift + R)"
echo "3. The CSP error should be resolved"
echo ""
echo "If the error persists, check CSP_FIX_GUIDE.md for more troubleshooting steps."

