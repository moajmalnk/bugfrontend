#!/bin/bash

# Clear Vite cache script
# This script helps resolve "Outdated Optimize Dep" errors

echo "🧹 Clearing Vite cache and dependencies..."

# Remove Vite cache
if [ -d "node_modules/.vite" ]; then
    echo "Removing Vite cache..."
    rm -rf node_modules/.vite
fi

# Remove node_modules and package-lock.json for fresh install
if [ -d "node_modules" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm package-lock.json
fi

# Reinstall dependencies
echo "Installing dependencies..."
npm install

echo "✅ Cache cleared and dependencies reinstalled!"
echo "You can now start the development server with: npm run dev"
