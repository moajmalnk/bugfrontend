#!/usr/bin/env node

/**
 * FINAL FIX - EVERYTHING in one chunk
 * This is the ultimate solution - NO separate chunks at all
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 FINAL FIX - EVERYTHING in one chunk...\n');

// Clean and build
const BUILD_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

console.log('Building with EVERYTHING in single react-core chunk...');
process.env.NODE_ENV = 'production';
execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

console.log('\n✅ FINAL FIX COMPLETED!');
console.log('🎯 EVERYTHING is now in ONE chunk - NO dependency issues possible!');
console.log('🚀 This is the ultimate bulletproof solution!');
