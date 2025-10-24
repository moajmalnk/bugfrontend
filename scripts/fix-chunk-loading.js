#!/usr/bin/env node

/**
 * Script to fix chunk loading issues in development
 * This script helps resolve common Vite chunk loading problems
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing chunk loading issues...');

// Clear Vite cache
const viteCacheDir = path.join(__dirname, '..', 'node_modules', '.vite');
if (fs.existsSync(viteCacheDir)) {
  console.log('🗑️  Clearing Vite cache...');
  fs.rmSync(viteCacheDir, { recursive: true, force: true });
}

// Clear dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('🗑️  Clearing dist directory...');
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Clear any temporary files
const tempFiles = [
  path.join(__dirname, '..', '.vite'),
  path.join(__dirname, '..', 'node_modules', '.cache'),
];

tempFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`🗑️  Clearing ${path.basename(file)}...`);
    fs.rmSync(file, { recursive: true, force: true });
  }
});

console.log('✅ Chunk loading fixes applied!');
console.log('💡 Next steps:');
console.log('   1. Restart your development server');
console.log('   2. Clear your browser cache');
console.log('   3. Try accessing the MyTasks page again');

// Check if we're in development mode
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  console.log('\n🚀 To restart the dev server, run:');
  console.log('   npm run dev');
  console.log('   # or');
  console.log('   yarn dev');
}
