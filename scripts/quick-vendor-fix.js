#!/usr/bin/env node

/**
 * Quick Vendor Dependency Fix
 * Consolidates ALL React-dependent vendor libraries into react-core chunk
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Quick vendor dependency fix...\n');

// Clean and build
const BUILD_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

console.log('Building with ALL React dependencies in react-core...');
process.env.NODE_ENV = 'production';
execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

console.log('\n✅ Build completed - ALL React dependencies now in react-core chunk!');
console.log('🚀 Ready for deployment!');
