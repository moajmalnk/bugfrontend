#!/usr/bin/env node

/**
 * Production deployment fix script for BugRicer
 * This script ensures the production build is deployed with all fixes applied
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting production deployment fix...\n');

// Step 1: Clean everything
console.log('1. Cleaning build environment...');
const BUILD_DIR = path.join(__dirname, '../dist');
const NODE_MODULES = path.join(__dirname, '../node_modules/.vite');

try {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(NODE_MODULES)) {
    fs.rmSync(NODE_MODULES, { recursive: true, force: true });
  }
  console.log('✅ Environment cleaned\n');
} catch (error) {
  console.warn('⚠️ Could not clean some directories:', error.message);
}

// Step 2: Install dependencies fresh
console.log('2. Installing dependencies...');
try {
  execSync('npm ci', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 3: Build with production configuration
console.log('3. Building production application...');
try {
  process.env.NODE_ENV = 'production';
  execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Production build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 4: Validate build output
console.log('4. Validating build output...');
const validateBuild = () => {
  const requiredFiles = ['index.html', 'manifest.json'];
  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(BUILD_DIR, file))
  );

  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles.join(', '));
    process.exit(1);
  }

  // Check for JS files
  const assetsDir = path.join(BUILD_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Assets directory not found');
    process.exit(1);
  }

  const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
  if (jsFiles.length === 0) {
    console.error('❌ No JavaScript files found in assets');
    process.exit(1);
  }

  console.log(`✅ Build validation passed (${jsFiles.length} JS files found)`);
};

validateBuild();

// Step 5: Create enhanced Vercel configuration
console.log('5. Creating enhanced Vercel configuration...');
const createVercelConfig = () => {
  const vercelConfig = {
    version: 2,
    builds: [
      {
        src: "package.json",
        use: "@vercel/static-build",
        config: {
          distDir: "dist"
        }
      }
    ],
    rewrites: [
      {
        source: "/:path*",
        destination: "/index.html"
      }
    ],
    headers: [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      },
      {
        source: "/assets/(.*\\.js)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      },
      {
        source: "/assets/(.*\\.mjs)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      },
      {
        source: "/(.*\\.js)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      },
      {
        source: "/assets/(.*\\.css)",
        headers: [
          {
            key: "Content-Type",
            value: "text/css; charset=utf-8"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  };

  const configPath = path.join(__dirname, '../vercel.json');
  fs.writeFileSync(configPath, JSON.stringify(vercelConfig, null, 2));
  console.log('✅ Enhanced Vercel configuration created');
};

createVercelConfig();

// Step 6: Create deployment manifest
console.log('6. Creating deployment manifest...');
const createDeploymentManifest = () => {
  const manifest = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    fixes: [
      'Fixed React createContext error by consolidating chunks',
      'Enhanced MIME type headers for all JavaScript files',
      'Added comprehensive error handling',
      'Improved chunk loading dependency order'
    ],
    buildInfo: {
      nodeEnv: process.env.NODE_ENV,
      buildTime: new Date().toISOString(),
      assets: fs.readdirSync(path.join(BUILD_DIR, 'assets')).length
    }
  };

  const manifestPath = path.join(BUILD_DIR, 'deployment-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Deployment manifest created');
};

createDeploymentManifest();

// Step 7: Deploy to Vercel
console.log('7. Deploying to Vercel...');
try {
  // Check if Vercel CLI is available
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Vercel CLI not found. Please install it with: npm i -g vercel');
    console.log('\n📋 Manual deployment steps:');
    console.log('1. Run: npm i -g vercel');
    console.log('2. Run: vercel login');
    console.log('3. Run: vercel --prod --yes');
    process.exit(1);
  }

  // Deploy with production environment
  execSync('vercel --prod --yes', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Deployment completed successfully\n');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n📋 Manual deployment steps:');
  console.log('1. Ensure you are logged into Vercel: vercel login');
  console.log('2. Deploy manually: vercel --prod --yes');
  process.exit(1);
}

// Step 8: Post-deployment verification
console.log('8. Post-deployment verification...');
const verifyDeployment = async () => {
  try {
    // Get deployment info
    const deploymentInfo = execSync('vercel ls --json', { encoding: 'utf8', cwd: path.join(__dirname, '..') });
    const deployments = JSON.parse(deploymentInfo);
    const latestDeployment = deployments[0];
    
    if (latestDeployment && latestDeployment.url) {
      console.log(`✅ Deployment successful!`);
      console.log(`🌐 URL: https://${latestDeployment.url}`);
      console.log(`📊 State: ${latestDeployment.state}`);
      
      console.log('\n🧪 Testing deployment...');
      console.log('Please manually test the following:');
      console.log('1. Open the deployed URL in a browser');
      console.log('2. Check browser console for any errors');
      console.log('3. Verify that JavaScript files load with correct MIME types');
      console.log('4. Test that framer-motion animations work properly');
      console.log('5. Ensure no "createContext" errors appear');
    }
  } catch (error) {
    console.warn('⚠️ Could not verify deployment automatically:', error.message);
  }
};

verifyDeployment();

console.log('\n🎉 Production deployment fix completed!');
console.log('\n📝 Summary of fixes applied:');
console.log('✅ Consolidated React and framer-motion into single chunk');
console.log('✅ Enhanced MIME type headers for all JavaScript files');
console.log('✅ Added comprehensive error handling and recovery');
console.log('✅ Improved chunk loading dependency order');
console.log('✅ Created enhanced Vercel configuration');

console.log('\n💡 Next steps:');
console.log('1. Test the deployed application thoroughly');
console.log('2. Monitor browser console for any remaining errors');
console.log('3. Verify MIME types are served correctly');
console.log('4. Check that all React contexts work properly');
console.log('5. Test framer-motion animations');

console.log('\n🔧 If issues persist:');
console.log('1. Clear browser cache completely');
console.log('2. Try incognito/private browsing mode');
console.log('3. Check Vercel function logs for server-side issues');
console.log('4. Verify the deployment manifest in the build output');
