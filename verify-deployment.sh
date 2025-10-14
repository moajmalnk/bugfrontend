#!/bin/bash
# Production deployment verification script

echo "🔍 Verifying production deployment..."

# Check if main entry point exists
if [ ! -f "dist/index.html" ]; then
  echo "❌ index.html not found"
  exit 1
fi

# Check for JavaScript files
JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
if [ $JS_COUNT -eq 0 ]; then
  echo "❌ No JavaScript files found"
  exit 1
fi

echo "✅ Found $JS_COUNT JavaScript files"

# Check for React core chunk
if find dist/assets -name "*react-core*" | grep -q .; then
  echo "✅ React core chunk found"
else
  echo "⚠️ React core chunk not found - may cause dependency issues"
fi

echo "✅ Deployment verification complete"
