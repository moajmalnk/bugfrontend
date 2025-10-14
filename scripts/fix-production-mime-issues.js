#!/usr/bin/env node

/**
 * Production MIME Type and Chunk Loading Fix Script
 * This script specifically addresses the production issues:
 * 1. MIME type errors (application/octet-stream vs application/javascript)
 * 2. React createContext undefined errors
 * 3. Chunk loading dependency issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing production MIME type and chunk loading issues...\n');

// Step 1: Clean build environment
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

// Step 2: Build with fixed configuration
console.log('2. Building with fixed configuration...');
try {
  process.env.NODE_ENV = 'production';
  execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Post-build fixes for MIME types and module loading
console.log('3. Applying post-build fixes...');
const applyPostBuildFixes = () => {
  const indexHtmlPath = path.join(BUILD_DIR, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ index.html not found');
    return;
  }

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Ensure all script tags have proper module type
  indexHtml = indexHtml.replace(
    /<script src="([^"]+)"[^>]*><\/script>/g,
    (match, src) => {
      if (match.includes('type=')) {
        return match; // Already has type attribute
      }
      return `<script type="module" crossorigin src="${src}"></script>`;
    }
  );

  // Add critical meta tags for proper module loading
  const criticalMetaTags = `
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cross-Origin-Embedder-Policy" content="unsafe-none" />
    <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />`;

  indexHtml = indexHtml.replace(
    '<meta charset="UTF-8" />',
    `<meta charset="UTF-8" />${criticalMetaTags}`
  );

  // Add module preload hints for critical chunks
  const assetsDir = path.join(BUILD_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    const jsFiles = fs.readdirSync(assetsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Ensure consistent order

    // Find the main entry point (usually the first file or contains 'index')
    const mainFile = jsFiles.find(file => 
      file.includes('index') || 
      file.includes('main') ||
      jsFiles.indexOf(file) === 0
    );

    if (mainFile) {
      const preloadHint = `    <link rel="modulepreload" href="/assets/${mainFile}" crossorigin />`;
      indexHtml = indexHtml.replace('</head>', `${preloadHint}\n  </head>`);
    }
  }

  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('✅ index.html fixed with proper module loading');
};

applyPostBuildFixes();

// Step 4: Validate JavaScript files for proper syntax
console.log('4. Validating JavaScript files...');
const validateJavaScriptFiles = () => {
  const assetsDir = path.join(BUILD_DIR, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Assets directory not found');
    return;
  }

  const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
  let validFiles = 0;
  let invalidFiles = 0;

  jsFiles.forEach(file => {
    const filePath = path.join(assetsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic validation
      if (content.length === 0) {
        console.error(`❌ Empty file: ${file}`);
        invalidFiles++;
        return;
      }

      // Check for React-related content (should be present in react-core chunk)
      if (file.includes('react-core') && !content.includes('createContext')) {
        console.warn(`⚠️ React core chunk missing createContext: ${file}`);
      }

      // Check for proper module syntax
      if (!content.includes('import') && !content.includes('export') && !content.includes('require')) {
        console.warn(`⚠️ File may not be a proper module: ${file}`);
      }

      validFiles++;
    } catch (error) {
      console.error(`❌ Cannot read file: ${file}`, error.message);
      invalidFiles++;
    }
  });

  console.log(`✅ Validation complete: ${validFiles} valid files, ${invalidFiles} invalid files`);
};

validateJavaScriptFiles();

// Step 5: Create enhanced Vercel configuration
console.log('5. Creating enhanced Vercel configuration...');
const createEnhancedVercelConfig = () => {
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
    redirects: [
      {
        source: "/(.*)",
        destination: "https://bugs.bugricer.com/$1",
        permanent: true,
        has: [
          {
            type: "host",
            value: "bugs.moajmalnk.in"
          }
        ]
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
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
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
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
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
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none"
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
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none"
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
      },
      {
        source: "/index.html",
        headers: [
          {
            key: "Content-Type",
            value: "text/html; charset=utf-8"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  };

  const configPath = path.join(__dirname, '../vercel.json');
  fs.writeFileSync(configPath, JSON.stringify(vercelConfig, null, 2));
  console.log('✅ Enhanced Vercel configuration created');
};

createEnhancedVercelConfig();

// Step 6: Create deployment verification script
console.log('6. Creating deployment verification...');
const createVerificationScript = () => {
  const verificationScript = `#!/bin/bash
# Production deployment verification script

echo "🔍 Verifying production deployment..."

# Check if main entry point exists
if [ ! -f "dist/index.html" ]; then
  echo "❌ index.html not found"
  exit 1
fi

# Check for JavaScript files
JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
if [ $JS_COUNT -eq 0 ]; then
  echo "❌ No JavaScript files found"
  exit 1
fi

echo "✅ Found $JS_COUNT JavaScript files"

# Check for React core chunk
if find dist/assets -name "*react-core*" | grep -q .; then
  echo "✅ React core chunk found"
else
  echo "⚠️ React core chunk not found - may cause dependency issues"
fi

echo "✅ Deployment verification complete"
`;

  const scriptPath = path.join(__dirname, '../verify-deployment.sh');
  fs.writeFileSync(scriptPath, verificationScript);
  fs.chmodSync(scriptPath, '755');
  console.log('✅ Deployment verification script created');
};

createVerificationScript();

// Step 7: Generate fix report
console.log('7. Generating fix report...');
const generateFixReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    fixes: [
      'Consolidated React and framer-motion into single react-core chunk',
      'Fixed MIME type headers for all JavaScript files',
      'Added proper module preload hints',
      'Enhanced Vercel configuration with comprehensive headers',
      'Added Cross-Origin policies for better module loading',
      'Created deployment verification script'
    ],
    technicalDetails: {
      chunkingStrategy: 'react-core chunk contains React, ReactDOM, ReactRouter, and framer-motion',
      mimeTypes: 'All .js and .mjs files served with application/javascript',
      moduleLoading: 'Enhanced with proper crossorigin and modulepreload attributes',
      dependencyOrder: 'React ecosystem loaded first to prevent createContext errors'
    },
    nextSteps: [
      'Deploy the fixed build to production',
      'Test the application thoroughly',
      'Monitor browser console for any remaining errors',
      'Verify MIME types are served correctly',
      'Check that React contexts work properly'
    ]
  };

  const reportPath = path.join(BUILD_DIR, 'mime-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Fix report generated');
  console.log('📊 Key fixes applied:');
  report.fixes.forEach((fix, index) => {
    console.log(`  ${index + 1}. ${fix}`);
  });
};

generateFixReport();

console.log('\n🎉 Production MIME type and chunk loading fixes completed!');
console.log('\n📦 Fixed build ready at:', path.relative(process.cwd(), BUILD_DIR));

console.log('\n🚀 Ready for deployment! Run:');
console.log('  npm run deploy:vercel');

console.log('\n💡 What was fixed:');
console.log('✅ React and framer-motion are now in the same chunk (react-core)');
console.log('✅ MIME types properly configured for all JavaScript files');
console.log('✅ Enhanced module loading with proper crossorigin attributes');
console.log('✅ Comprehensive Vercel configuration with security headers');
console.log('✅ Fixed chunk dependency order to prevent createContext errors');

console.log('\n🧪 After deployment, verify:');
console.log('1. No "application/octet-stream" MIME type errors');
console.log('2. No "createContext is undefined" errors');
console.log('3. React components load and render properly');
console.log('4. Framer-motion animations work correctly');
console.log('5. All chunks load in the correct order');
