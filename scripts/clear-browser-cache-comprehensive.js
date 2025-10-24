#!/usr/bin/env node

/**
 * Comprehensive Browser Cache Clearing Script
 * This script provides multiple methods to clear browser cache and resolve
 * Vite development server issues including CSP syntax errors and chunk loading failures
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Comprehensive Browser Cache Clearing Tool');
console.log('=============================================');
console.log('');

// Method 1: Clear browser cache via JavaScript injection
function generateCacheClearingScript() {
  return `
// Browser Cache Clearing Script
// This script clears various browser caches and storage

console.log('🧹 Clearing browser cache and storage...');

// Clear all caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
      console.log('✅ Cleared cache:', name);
    }
  });
}

// Clear localStorage
try {
  localStorage.clear();
  console.log('✅ Cleared localStorage');
} catch (e) {
  console.log('⚠️ Could not clear localStorage:', e.message);
}

// Clear sessionStorage
try {
  sessionStorage.clear();
  console.log('✅ Cleared sessionStorage');
} catch (e) {
  console.log('⚠️ Could not clear sessionStorage:', e.message);
}

// Clear IndexedDB
if ('indexedDB' in window) {
  try {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        indexedDB.deleteDatabase(db.name);
        console.log('✅ Cleared IndexedDB:', db.name);
      });
    });
  } catch (e) {
    console.log('⚠️ Could not clear IndexedDB:', e.message);
  }
}

// Force reload without cache
setTimeout(() => {
  console.log('🔄 Reloading page without cache...');
  window.location.reload(true);
}, 1000);
`;
}

// Method 2: Create a cache-busting URL
function generateCacheBustingURL() {
  const timestamp = Date.now();
  return `http://localhost:8080/?v=${timestamp}&cache-bust=true`;
}

// Method 3: Generate browser-specific instructions
function generateBrowserInstructions() {
  return {
    chrome: [
      '1. Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)',
      '2. Or open DevTools (F12) > Application > Storage > Clear site data',
      '3. Or go to Settings > Privacy > Clear browsing data > Advanced > All time',
      '4. Or use incognito/private mode'
    ],
    firefox: [
      '1. Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)',
      '2. Or open DevTools (F12) > Storage > Clear All',
      '3. Or go to Settings > Privacy > Clear Data',
      '4. Or use private browsing mode'
    ],
    safari: [
      '1. Press Cmd+Option+R',
      '2. Or go to Develop > Empty Caches',
      '3. Or go to Safari > Clear History and Website Data',
      '4. Or use private browsing mode'
    ],
    edge: [
      '1. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)',
      '2. Or open DevTools (F12) > Application > Storage > Clear site data',
      '3. Or go to Settings > Privacy > Clear browsing data',
      '4. Or use InPrivate mode'
    ]
  };
}

// Method 4: Create a test page to verify cache clearing
function generateTestPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cache Clearing Test - BugRicer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .log { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧹 Cache Clearing Test</h1>
        <p>This page helps verify that browser cache has been cleared and the development server is working correctly.</p>
        
        <div id="status">
            <h2>Status Check</h2>
            <div id="checks"></div>
        </div>
        
        <div id="actions">
            <h2>Actions</h2>
            <button onclick="clearAllCaches()">Clear All Caches</button>
            <button onclick="testEndpoints()">Test Endpoints</button>
            <button onclick="reloadWithoutCache()">Reload Without Cache</button>
        </div>
        
        <div id="log" class="log"></div>
    </div>

    <script>
        const log = document.getElementById('log');
        const checks = document.getElementById('checks');
        
        function addLog(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
            log.innerHTML += \`<span class="\${className}">[\${timestamp}] \${message}</span>\\n\`;
        }
        
        function addCheck(name, status, message) {
            const className = status === 'success' ? 'success' : status === 'error' ? 'error' : 'warning';
            checks.innerHTML += \`<div class="\${className}">\${name}: \${message}</div>\`;
        }
        
        async function clearAllCaches() {
            addLog('🧹 Starting cache clearing process...', 'info');
            
            // Clear caches
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        await caches.delete(name);
                        addLog(\`✅ Cleared cache: \${name}\`, 'success');
                    }
                } catch (e) {
                    addLog(\`❌ Error clearing caches: \${e.message}\`, 'error');
                }
            }
            
            // Clear localStorage
            try {
                localStorage.clear();
                addLog('✅ Cleared localStorage', 'success');
            } catch (e) {
                addLog(\`⚠️ Could not clear localStorage: \${e.message}\`, 'warning');
            }
            
            // Clear sessionStorage
            try {
                sessionStorage.clear();
                addLog('✅ Cleared sessionStorage', 'success');
            } catch (e) {
                addLog(\`⚠️ Could not clear sessionStorage: \${e.message}\`, 'warning');
            }
            
            addLog('🎉 Cache clearing complete!', 'success');
        }
        
        async function testEndpoints() {
            addLog('🧪 Testing critical endpoints...', 'info');
            
            const endpoints = [
                '/',
                '/src/pages/Projects.tsx',
                '/node_modules/.vite/deps/framer-motion.js',
                '/node_modules/.vite/deps/react-dom.js'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        addLog(\`✅ \${endpoint}: OK (\${response.status})\`, 'success');
                        addCheck(endpoint, 'success', 'OK');
                    } else {
                        addLog(\`⚠️ \${endpoint}: Status \${response.status}\`, 'warning');
                        addCheck(endpoint, 'warning', \`Status \${response.status}\`);
                    }
                } catch (e) {
                    addLog(\`❌ \${endpoint}: \${e.message}\`, 'error');
                    addCheck(endpoint, 'error', e.message);
                }
            }
        }
        
        function reloadWithoutCache() {
            addLog('🔄 Reloading page without cache...', 'info');
            window.location.reload(true);
        }
        
        // Auto-run tests on page load
        window.addEventListener('load', () => {
            addLog('🚀 Cache clearing test page loaded', 'info');
            testEndpoints();
        });
    </script>
</body>
</html>`;
}

// Main function
function main() {
  console.log('This tool provides multiple methods to clear browser cache:');
  console.log('');
  
  // Method 1: JavaScript injection
  console.log('📝 Method 1: JavaScript Cache Clearing Script');
  console.log('Copy and paste this into your browser console:');
  console.log('─'.repeat(60));
  console.log(generateCacheClearingScript());
  console.log('─'.repeat(60));
  console.log('');
  
  // Method 2: Cache-busting URL
  console.log('🔗 Method 2: Cache-Busting URL');
  console.log('Open this URL in your browser:');
  console.log(generateCacheBustingURL());
  console.log('');
  
  // Method 3: Browser-specific instructions
  console.log('🌐 Method 3: Browser-Specific Instructions');
  const instructions = generateBrowserInstructions();
  
  Object.entries(instructions).forEach(([browser, steps]) => {
    console.log(`\n${browser.charAt(0).toUpperCase() + browser.slice(1)}:`);
    steps.forEach(step => console.log(`  ${step}`));
  });
  
  console.log('');
  
  // Method 4: Test page
  console.log('🧪 Method 4: Test Page');
  const testPagePath = path.join(__dirname, '..', 'public', 'cache-test.html');
  try {
    fs.writeFileSync(testPagePath, generateTestPage());
    console.log(`✅ Created test page: ${testPagePath}`);
    console.log('Open this URL in your browser:');
    console.log('http://localhost:8080/cache-test.html');
  } catch (e) {
    console.log(`❌ Could not create test page: ${e.message}`);
  }
  
  console.log('');
  console.log('💡 Additional Tips:');
  console.log('• Use incognito/private mode for a completely clean environment');
  console.log('• Disable browser extensions temporarily');
  console.log('• Check if antivirus software is interfering');
  console.log('• Try a different browser');
  console.log('');
  console.log('🎯 For Vite-specific issues:');
  console.log('• The development server should be running on http://localhost:8080');
  console.log('• All dependencies should load without 504 errors');
  console.log('• Projects.tsx should load without chunk loading failures');
  console.log('• No CSP syntax errors should appear in console');
}

// Run the main function
main();
