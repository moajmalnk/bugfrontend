#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Build optimization script for BugRicer
 * This script optimizes the build process and validates the output
 */

const BUILD_DIR = path.join(__dirname, '../dist');
const ANALYZE_BUNDLE = process.argv.includes('--analyze');
const PRODUCTION_BUILD = process.env.NODE_ENV === 'production';

console.log('🚀 Starting BugRicer build optimization...\n');

// Step 1: Clean previous build
console.log('1. Cleaning previous build...');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
console.log('✅ Build directory cleaned\n');

// Step 2: Run Vite build
console.log('2. Running Vite build...');
try {
  const buildCommand = PRODUCTION_BUILD ? 'npm run build' : 'npm run build:dev';
  execSync(buildCommand, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Vite build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Analyze bundle size
if (ANALYZE_BUNDLE) {
  console.log('3. Analyzing bundle size...');
  try {
    execSync('npx vite-bundle-analyzer dist', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Bundle analysis completed\n');
  } catch (error) {
    console.warn('⚠️ Bundle analysis failed:', error.message);
  }
}

// Step 4: Validate build output
console.log('4. Validating build output...');
const validateBuild = () => {
  const requiredFiles = [
    'index.html',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'browserconfig.xml',
  ];

  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(BUILD_DIR, file))
  );

  if (missingFiles.length > 0) {
    console.warn('⚠️ Missing files:', missingFiles.join(', '));
  } else {
    console.log('✅ All required files present');
  }

  // Check for large files
  const checkFileSizes = (dir, maxSize = 500 * 1024) => { // 500KB
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        checkFileSizes(filePath, maxSize);
      } else {
        const stats = fs.statSync(filePath);
        if (stats.size > maxSize) {
          console.warn(`⚠️ Large file detected: ${path.relative(BUILD_DIR, filePath)} (${(stats.size / 1024).toFixed(2)}KB)`);
        }
      }
    });
  };

  checkFileSizes(BUILD_DIR);
  console.log('✅ File size validation completed\n');
};

validateBuild();

// Step 5: Generate build report
console.log('5. Generating build report...');
const generateBuildReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    buildMode: PRODUCTION_BUILD ? 'production' : 'development',
    version: process.env.npm_package_version || '1.0.0',
    files: [],
    totalSize: 0,
    optimization: {
      minified: PRODUCTION_BUILD,
      treeshaking: true,
      codeSplitting: true,
      lazyLoading: true,
      serviceWorker: true,
      pwa: true,
      seo: true,
      accessibility: true,
    }
  };

  const scanDirectory = (dir, basePath = '') => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      const relativePath = path.join(basePath, file.name);
      
      if (file.isDirectory()) {
        scanDirectory(filePath, relativePath);
      } else {
        const stats = fs.statSync(filePath);
        const fileInfo = {
          path: relativePath,
          size: stats.size,
          type: path.extname(file.name).slice(1) || 'unknown',
          lastModified: stats.mtime.toISOString(),
        };
        
        report.files.push(fileInfo);
        report.totalSize += stats.size;
      }
    });
  };

  scanDirectory(BUILD_DIR);

  // Sort files by size (largest first)
  report.files.sort((a, b) => b.size - a.size);

  // Write report to file
  const reportPath = path.join(BUILD_DIR, 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Build report generated: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`📊 Total build size: ${(report.totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📁 Total files: ${report.files.length}`);
  
  // Show largest files
  console.log('\n📈 Largest files:');
  report.files.slice(0, 10).forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.path} (${(file.size / 1024).toFixed(2)}KB)`);
  });
};

generateBuildReport();

// Step 6: Performance recommendations
console.log('\n6. Performance recommendations:');
const recommendations = [];

// Check for large JavaScript files
const jsFiles = fs.readdirSync(BUILD_DIR, { recursive: true })
  .filter(file => file.endsWith('.js'))
  .map(file => ({
    name: file,
    size: fs.statSync(path.join(BUILD_DIR, file)).size
  }))
  .sort((a, b) => b.size - a.size);

if (jsFiles.length > 0 && jsFiles[0].size > 250 * 1024) {
  recommendations.push('Consider code splitting for large JavaScript bundles');
}

// Check for large CSS files
const cssFiles = fs.readdirSync(BUILD_DIR, { recursive: true })
  .filter(file => file.endsWith('.css'))
  .map(file => ({
    name: file,
    size: fs.statSync(path.join(BUILD_DIR, file)).size
  }))
  .sort((a, b) => b.size - a.size);

if (cssFiles.length > 0 && cssFiles[0].size > 100 * 1024) {
  recommendations.push('Consider CSS optimization for large stylesheets');
}

// Check for images
const imageFiles = fs.readdirSync(BUILD_DIR, { recursive: true })
  .filter(file => /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(file))
  .map(file => ({
    name: file,
    size: fs.statSync(path.join(BUILD_DIR, file)).size
  }))
  .sort((a, b) => b.size - a.size);

if (imageFiles.length > 0 && imageFiles[0].size > 500 * 1024) {
  recommendations.push('Consider image optimization for large assets');
}

if (recommendations.length === 0) {
  console.log('✅ No performance issues detected');
} else {
  console.log('💡 Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
}

console.log('\n🎉 Build optimization completed successfully!');
console.log(`📦 Build output: ${path.relative(process.cwd(), BUILD_DIR)}`);

if (PRODUCTION_BUILD) {
  console.log('\n🚀 Production build ready for deployment!');
  console.log('💡 Consider running lighthouse audit for performance validation');
}
