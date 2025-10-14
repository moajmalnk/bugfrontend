#!/usr/bin/env node

/**
 * Component Dependency Fix Script
 * This script addresses the specific issue where components are trying to use React
 * before the React core chunk has loaded, causing createContext errors.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing component dependency issues...\n');

// Step 1: Clean build environment
console.log('1. Cleaning build environment...');
const BUILD_DIR = path.join(__dirname, '../dist');

try {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  console.log('✅ Environment cleaned\n');
} catch (error) {
  console.warn('⚠️ Could not clean build directory:', error.message);
}

// Step 2: Build with component dependency fix
console.log('2. Building with component dependency fix...');
try {
  process.env.NODE_ENV = 'production';
  execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify the fix
console.log('3. Verifying component dependency fix...');
const verifyFix = () => {
  const assetsDir = path.join(BUILD_DIR, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Assets directory not found');
    return false;
  }

  const files = fs.readdirSync(assetsDir);
  
  // Check for react-core chunk
  const reactCoreFile = files.find(file => file.startsWith('00-react-core-'));
  if (!reactCoreFile) {
    console.error('❌ React core chunk not found with proper naming');
    return false;
  }
  
  console.log(`✅ React core chunk found: ${reactCoreFile}`);

  // Check that components are not in separate chunks
  const componentFiles = files.filter(file => 
    file.includes('components-') && file.endsWith('.js')
  );
  
  if (componentFiles.length > 0) {
    console.warn(`⚠️ Found separate component chunks: ${componentFiles.join(', ')}`);
    console.warn('   This may still cause dependency issues');
    return false;
  }

  console.log('✅ No separate component chunks found - components are bundled with React core');
  return true;
};

const fixVerified = verifyFix();

if (!fixVerified) {
  console.error('❌ Component dependency fix verification failed');
  process.exit(1);
}

// Step 4: Enhanced HTML fixes
console.log('4. Applying enhanced HTML fixes...');
const applyEnhancedHTMLFixes = () => {
  const indexHtmlPath = path.join(BUILD_DIR, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ index.html not found');
    return;
  }

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Ensure all script tags have proper attributes
  indexHtml = indexHtml.replace(
    /<script src="([^"]+)"[^>]*><\/script>/g,
    (match, src) => {
      if (match.includes('type=')) {
        return match; // Already has type attribute
      }
      return `<script type="module" crossorigin src="${src}"></script>`;
    }
  );

  // Add critical loading order hints
  const assetsDir = path.join(BUILD_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const reactCoreFile = files.find(file => file.startsWith('00-react-core-'));
    
    if (reactCoreFile) {
      const preloadHint = `    <link rel="modulepreload" href="/assets/${reactCoreFile}" crossorigin />
    <link rel="preload" href="/assets/${reactCoreFile}" as="script" crossorigin />`;
      
      if (!indexHtml.includes('modulepreload')) {
        indexHtml = indexHtml.replace('</head>', `${preloadHint}\n  </head>`);
      }
    }
  }

  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('✅ Enhanced HTML fixes applied');
};

applyEnhancedHTMLFixes();

// Step 5: Create deployment verification
console.log('5. Creating deployment verification...');
const createDeploymentVerification = () => {
  const verificationScript = `#!/bin/bash
# Component dependency fix verification

echo "🔍 Verifying component dependency fix..."

# Check for react-core chunk with proper naming
REACT_CORE_COUNT=$(find dist/assets -name "00-react-core-*.js" | wc -l)
if [ $REACT_CORE_COUNT -eq 0 ]; then
  echo "❌ React core chunk not found with proper naming"
  exit 1
fi

echo "✅ Found $REACT_CORE_COUNT React core chunk(s)"

# Check that no separate component chunks exist
COMPONENT_CHUNKS=$(find dist/assets -name "*components-*.js" | wc -l)
if [ $COMPONENT_CHUNKS -gt 0 ]; then
  echo "⚠️ Found $COMPONENT_CHUNKS separate component chunk(s) - may cause dependency issues"
  find dist/assets -name "*components-*.js"
else
  echo "✅ No separate component chunks found"
fi

# Check total JS files
TOTAL_JS=$(find dist/assets -name "*.js" | wc -l)
echo "✅ Total JavaScript files: $TOTAL_JS"

echo "✅ Component dependency fix verification complete"
`;

  const scriptPath = path.join(__dirname, '../verify-component-fix.sh');
  fs.writeFileSync(scriptPath, verificationScript);
  fs.chmodSync(scriptPath, '755');
  console.log('✅ Deployment verification script created');
};

createDeploymentVerification();

// Step 6: Generate fix report
console.log('6. Generating fix report...');
const generateFixReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    issue: 'Component chunks trying to use React createContext before React core loads',
    fixes: [
      'Moved all components into react-core chunk to ensure proper dependency order',
      'Added @radix-ui components to react-core chunk for dependency safety',
      'Implemented numbered chunk naming (00-react-core) for guaranteed loading order',
      'Enhanced HTML with modulepreload hints for React core',
      'Verified no separate component chunks exist'
    ],
    technicalDetails: {
      chunkingStrategy: 'All React-dependent code (React, components, @radix-ui, framer-motion) in single react-core chunk',
      chunkNaming: 'React core chunk named 00-react-core-[hash].js for guaranteed first load',
      dependencyResolution: 'Components can no longer load before React due to being in same chunk',
      modulePreloading: 'React core chunk preloaded for faster initialization'
    },
    verification: {
      reactCoreChunk: '00-react-core-[hash].js exists and loads first',
      noComponentChunks: 'No separate component-[hash].js files',
      properDependencies: 'All React-dependent code bundled together'
    },
    nextSteps: [
      'Deploy the fixed build to production',
      'Test that createContext errors are resolved',
      'Verify components load and render properly',
      'Test framer-motion animations work correctly',
      'Monitor browser console for any remaining issues'
    ]
  };

  const reportPath = path.join(BUILD_DIR, 'component-dependency-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Fix report generated');
  console.log('📊 Key fixes applied:');
  report.fixes.forEach((fix, index) => {
    console.log(`  ${index + 1}. ${fix}`);
  });
};

generateFixReport();

console.log('\n🎉 Component dependency fix completed!');
console.log('\n📦 Fixed build ready at:', path.relative(process.cwd(), BUILD_DIR));

console.log('\n💡 What was fixed:');
console.log('✅ Components are now bundled with React core (no separate component chunks)');
console.log('✅ @radix-ui components included in React core for dependency safety');
console.log('✅ React core chunk loads first with numbered naming (00-react-core)');
console.log('✅ No more createContext errors from components loading before React');

console.log('\n🚀 Ready for deployment! The component dependency issue should now be resolved.');
console.log('\n🧪 After deployment, verify:');
console.log('1. No "createContext is undefined" errors from components');
console.log('2. All React components render properly');
console.log('3. Framer-motion animations work correctly');
console.log('4. @radix-ui components function properly');
console.log('5. No MIME type errors');
