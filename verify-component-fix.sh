#!/bin/bash
# Component dependency fix verification

echo "🔍 Verifying component dependency fix..."

# Check for react-core chunk with proper naming
REACT_CORE_COUNT=$(find dist/assets -name "00-react-core-*.js" | wc -l)
if [ $REACT_CORE_COUNT -eq 0 ]; then
  echo "❌ React core chunk not found with proper naming"
  exit 1
fi

echo "✅ Found $REACT_CORE_COUNT React core chunk(s)"

# Check that no separate component chunks exist
COMPONENT_CHUNKS=$(find dist/assets -name "*components-*.js" | wc -l)
if [ $COMPONENT_CHUNKS -gt 0 ]; then
  echo "⚠️ Found $COMPONENT_CHUNKS separate component chunk(s) - may cause dependency issues"
  find dist/assets -name "*components-*.js"
else
  echo "✅ No separate component chunks found"
fi

# Check total JS files
TOTAL_JS=$(find dist/assets -name "*.js" | wc -l)
echo "✅ Total JavaScript files: $TOTAL_JS"

echo "✅ Component dependency fix verification complete"
