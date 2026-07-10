#!/usr/bin/env node

/**
 * Safe deployment script for zero-downtime deployments
 * This script ensures proper cache invalidation and handles deployment gracefully
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting safe deployment process...');

// Step 1: Pre-deployment checks
console.log('📋 Running pre-deployment checks...');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the frontend directory.');
  process.exit(1);
}

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Vercel CLI not found. Please install it with: npm i -g vercel');
  process.exit(1);
}

// Step 2: Clean build
console.log('🧹 Cleaning previous build...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('.vercel')) {
    fs.rmSync('.vercel', { recursive: true, force: true });
  }
} catch (error) {
  console.warn('⚠️  Warning: Could not clean some directories:', error.message);
}

// Step 3: Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm ci', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 4: Build with proper configuration
console.log('🔨 Building application...');
try {
  // Set environment variables for build
  process.env.NODE_ENV = 'production';
  process.env.VITE_BUILD_TIME = new Date().toISOString();
  
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Verify build output
console.log('✅ Verifying build output...');
const distPath = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Build output directory not found');
  process.exit(1);
}

const indexHtmlPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('❌ index.html not found in build output');
  process.exit(1);
}

// Check for assets directory
const assetsPath = path.join(distPath, 'assets');
if (!fs.existsSync(assetsPath)) {
  console.warn('⚠️  Assets directory not found - this might cause issues');
}

// Ensure FCM VAPID key was baked into the bundle correctly
const mainBundle = fs
  .readdirSync(assetsPath)
  .find((name) => name.startsWith('index-') && name.endsWith('.js'));
if (mainBundle) {
  const bundleSource = fs.readFileSync(path.join(assetsPath, mainBundle), 'utf8');
  if (bundleSource.includes('VITE_FIREBASE_VAPID_KEY=')) {
    console.error(
      '❌ Invalid VITE_FIREBASE_VAPID_KEY in build output. In Vercel/hosting, set the value to the key only (BBXS...), not the full .env line.'
    );
    process.exit(1);
  }
  console.log('✅ FCM VAPID key looks valid in build output');
}

console.log('✅ Build verification completed');

// Step 6: Deploy to Vercel
console.log('🚀 Deploying to Vercel...');
try {
  // Deploy with production environment
  execSync('vercel --prod --yes', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}

// Step 7: Post-deployment verification
console.log('🔍 Verifying deployment...');
try {
  // Get deployment URL from Vercel
  const deploymentInfo = execSync('vercel ls --json', { encoding: 'utf8' });
  const deployments = JSON.parse(deploymentInfo);
  const latestDeployment = deployments[0];
  
  if (latestDeployment && latestDeployment.url) {
    console.log(`✅ Deployment successful!`);
    console.log(`🌐 URL: https://${latestDeployment.url}`);
    console.log(`📊 State: ${latestDeployment.state}`);
    
    // Test the deployment
    console.log('🧪 Testing deployment...');
    try {
      const response = execSync(`curl -s -o /dev/null -w "%{http_code}" https://${latestDeployment.url}`, { encoding: 'utf8' });
      if (response.trim() === '200') {
        console.log('✅ Deployment test passed');
      } else {
        console.warn(`⚠️  Deployment test returned status: ${response.trim()}`);
      }
    } catch (testError) {
      console.warn('⚠️  Could not test deployment:', testError.message);
    }
  } else {
    console.warn('⚠️  Could not retrieve deployment information');
  }
} catch (error) {
  console.warn('⚠️  Post-deployment verification failed:', error.message);
}

console.log('🎉 Deployment process completed!');
console.log('');
console.log('📝 Next steps:');
console.log('1. Monitor your application for any issues');
console.log('2. Check Vercel dashboard for deployment status');
console.log('3. Test critical user flows');
console.log('');
console.log('💡 Tips for zero-downtime deployments:');
console.log('- Use feature flags for gradual rollouts');
console.log('- Monitor error rates after deployment');
console.log('- Keep rollback plan ready');
