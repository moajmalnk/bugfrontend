#!/usr/bin/env node

/**
 * Vite Development Server Diagnostic Script
 * This script helps diagnose common Vite development server issues
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = 'http://localhost:8080';
const DIAGNOSTIC_ENDPOINTS = [
  '/',
  '/src/pages/Projects.tsx',
  '/node_modules/.vite/deps/framer-motion.js',
  '/node_modules/.vite/deps/react-dom.js'
];

console.log('🔍 Vite Development Server Diagnostic Tool');
console.log('==========================================');
console.log('');

// Check if server is running
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      console.log(`✅ Server is running (Status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ Server is not running: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Server connection timeout');
      resolve(false);
    });
  });
}

// Test specific endpoints
async function testEndpoints() {
  console.log('🧪 Testing critical endpoints...');
  console.log('');
  
  for (const endpoint of DIAGNOSTIC_ENDPOINTS) {
    try {
      const result = await new Promise((resolve) => {
        const req = http.get(`${SERVER_URL}${endpoint}`, (res) => {
          resolve({
            status: res.statusCode,
            contentType: res.headers['content-type'],
            contentLength: res.headers['content-length']
          });
        });
        
        req.on('error', (err) => {
          resolve({ error: err.message });
        });
        
        req.setTimeout(3000, () => {
          resolve({ error: 'Timeout' });
        });
      });
      
      if (result.error) {
        console.log(`❌ ${endpoint}: ${result.error}`);
      } else if (result.status === 200) {
        console.log(`✅ ${endpoint}: OK (${result.contentType})`);
      } else {
        console.log(`⚠️  ${endpoint}: Status ${result.status}`);
      }
    } catch (err) {
      console.log(`❌ ${endpoint}: ${err.message}`);
    }
  }
}

// Check for common issues
function checkCommonIssues() {
  console.log('');
  console.log('🔧 Checking for common issues...');
  console.log('');
  
  // Check if Vite cache exists
  const viteCachePath = path.join(__dirname, '..', 'node_modules/.vite');
  if (fs.existsSync(viteCachePath)) {
    console.log('📁 Vite cache directory exists');
    
    // Check cache age
    const stats = fs.statSync(viteCachePath);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      console.log(`⚠️  Vite cache is ${ageHours.toFixed(1)} hours old - consider clearing it`);
    } else {
      console.log(`✅ Vite cache is fresh (${ageHours.toFixed(1)} hours old)`);
    }
  } else {
    console.log('📁 No Vite cache directory found');
  }
  
  // Check for dist directory
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    console.log('📁 Build directory exists - this might interfere with dev server');
  }
  
  // Check package.json for dev script
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.scripts && packageJson.scripts.dev) {
      console.log('✅ Dev script found in package.json');
    } else {
      console.log('❌ No dev script found in package.json');
    }
  }
}

// Provide recommendations
function provideRecommendations() {
  console.log('');
  console.log('💡 Recommendations:');
  console.log('');
  console.log('If you encounter issues:');
  console.log('1. Run: ./scripts/fix-vite-errors.sh');
  console.log('2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('3. Check browser console for JavaScript errors');
  console.log('4. Ensure no other processes are using port 8080');
  console.log('');
  console.log('Common error patterns:');
  console.log('- CSP syntax errors: Usually resolved by clearing cache');
  console.log('- 504 Outdated Optimize Dep: Clear node_modules/.vite');
  console.log('- Chunk loading failures: Restart dev server');
  console.log('- Module resolution issues: Check import paths');
}

// Main diagnostic function
async function runDiagnostics() {
  const isServerRunning = await checkServerHealth();
  
  if (isServerRunning) {
    await testEndpoints();
  }
  
  checkCommonIssues();
  provideRecommendations();
  
  console.log('');
  console.log('🏁 Diagnostic complete!');
}

// Run diagnostics
runDiagnostics().catch(console.error);
