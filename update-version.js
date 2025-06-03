#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a unique version based on timestamp and random hash
function generateVersion() {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '');
  const hash = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${hash}`;
}

// Update version.json file
function updateVersion() {
  const versionFilePath = path.join(__dirname, 'frontend', 'public', 'version.json');
  
  try {
    const currentVersion = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
    
    const newVersion = {
      version: generateVersion(),
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      previousVersion: currentVersion.version
    };
    
    fs.writeFileSync(versionFilePath, JSON.stringify(newVersion, null, 2));
    
    console.log('✅ Version updated successfully:');
    console.log(`   Previous: ${currentVersion.version}`);
    console.log(`   New: ${newVersion.version}`);
    console.log(`   Build Date: ${newVersion.buildDate}`);
    
    return newVersion;
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateVersion();
}

module.exports = { updateVersion, generateVersion }; 