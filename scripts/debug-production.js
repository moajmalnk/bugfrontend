#!/usr/bin/env node

/**
 * Production Debug Helper Script
 * 
 * This script helps diagnose production deployment issues:
 * - Forces cache busting
 * - Updates version numbers
 * - Provides debugging instructions
 */

const fs = require('fs');
const path = require('path');

// console.log('🔧 Production Debug Helper\n');

// Update version.json with current timestamp
const versionFile = path.join(__dirname, '../frontend/public/version.json');
const currentVersion = {
  version: "1.0.8",
  timestamp: new Date().toISOString(),
  build: `production-debug-${Date.now()}`,
  environment: "production"
};

try {
  fs.writeFileSync(versionFile, JSON.stringify(currentVersion, null, 2));
  // console.log('✅ Updated version.json for cache busting');
} catch (error) {
  // console.error('❌ Failed to update version.json:', error.message);
}

// Update package.json build time
const packageFile = path.join(__dirname, '../frontend/package.json');
try {
  const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  packageData.buildTime = new Date().toISOString();
  fs.writeFileSync(packageFile, JSON.stringify(packageData, null, 2));
  // console.log('✅ Updated package.json build timestamp');
} catch (error) {
  // console.error('❌ Failed to update package.json:', error.message);
}

// console.log('\n📋 Next Steps:');
// console.log('1. Commit these changes: git add . && git commit -m "force production rebuild"');
// console.log('2. Push to trigger deployment: git push');
// console.log('3. In Vercel dashboard, clear build cache if needed');
// console.log('4. To enable timezone debug in production, run in browser console:');
// console.log('   localStorage.setItem("showTimezoneDebug", "true"); location.reload();');
// console.log('\n🔍 Troubleshooting:');
// console.log('- Check Vercel function logs');
// console.log('- Verify environment variables');
// console.log('- Check browser DevTools for responsive CSS issues');
// console.log('- Clear browser cache and hard refresh (Ctrl+Shift+R)'); 