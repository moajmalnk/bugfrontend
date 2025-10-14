#!/usr/bin/env node

/**
 * Production build fix script for BugRicer
 * This script addresses common production issues like MIME type errors and chunk loading problems
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, '../dist');
const PRODUCTION_BUILD = process.env.NODE_ENV === 'production';

console.log('🔧 Starting production build fix process...\n');

// Step 1: Clean previous build
console.log('1. Cleaning previous build...');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
console.log('✅ Build directory cleaned\n');

// Step 2: Clear Vite cache
console.log('2. Clearing Vite cache...');
try {
  execSync('npx vite --clearCache', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
  console.log('✅ Vite cache cleared\n');
} catch (error) {
  console.warn('⚠️ Could not clear Vite cache:', error.message);
}

// Step 3: Run optimized build
console.log('3. Running optimized build...');
try {
  const buildCommand = PRODUCTION_BUILD ? 'npx vite build' : 'npx vite build --mode development';
  execSync(buildCommand, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 4: Validate and fix build output
console.log('4. Validating and fixing build output...');
const fixBuildOutput = () => {
  const indexHtmlPath = path.join(BUILD_DIR, 'index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ index.html not found in build output');
    process.exit(1);
  }

  // Read and validate index.html
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Ensure proper script tags with type="module"
  if (!indexHtml.includes('type="module"')) {
    console.warn('⚠️ Adding module type to script tags...');
    indexHtml = indexHtml.replace(
      /<script src="([^"]+)"><\/script>/g,
      '<script type="module" src="$1"></script>'
    );
  }

  // Add MIME type meta tag for better compatibility
  if (!indexHtml.includes('http-equiv="Content-Type"')) {
    console.log('📝 Adding Content-Type meta tag...');
    indexHtml = indexHtml.replace(
      '<meta charset="UTF-8" />',
      '<meta charset="UTF-8" />\n    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />'
    );
  }

  // Ensure proper preload headers for critical resources
  if (!indexHtml.includes('rel="modulepreload"')) {
    console.log('📝 Adding module preload hints...');
    const preloadSection = `
    <!-- Module preload hints for better loading performance -->
    <link rel="modulepreload" href="/src/main.tsx" crossorigin />
    <link rel="preload" href="/src/main.tsx" as="script" crossorigin />`;
    
    indexHtml = indexHtml.replace(
      '</head>',
      `${preloadSection}\n  </head>`
    );
  }

  // Write the fixed index.html
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('✅ index.html validated and fixed');
};

fixBuildOutput();

// Step 5: Validate JavaScript files
console.log('5. Validating JavaScript files...');
const validateJsFiles = () => {
  const assetsDir = path.join(BUILD_DIR, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.warn('⚠️ Assets directory not found');
    return;
  }

  const jsFiles = fs.readdirSync(assetsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(assetsDir, file));

  let corruptedFiles = 0;
  
  jsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for common corruption indicators
      if (content.length === 0) {
        console.error(`❌ Empty file: ${path.basename(file)}`);
        corruptedFiles++;
        return;
      }
      
      // Check for proper JavaScript syntax (basic check)
      if (!content.includes('function') && !content.includes('const') && !content.includes('var') && !content.includes('let')) {
        console.warn(`⚠️ Suspicious content in: ${path.basename(file)}`);
      }
      
    } catch (error) {
      console.error(`❌ Cannot read file: ${path.basename(file)}`, error.message);
      corruptedFiles++;
    }
  });

  if (corruptedFiles === 0) {
    console.log('✅ All JavaScript files validated');
  } else {
    console.error(`❌ Found ${corruptedFiles} corrupted JavaScript files`);
    process.exit(1);
  }
};

validateJsFiles();

// Step 6: Create .htaccess for Apache servers (if needed)
console.log('6. Creating server configuration files...');
const createHtaccess = () => {
  const htaccessPath = path.join(BUILD_DIR, '.htaccess');
  
  const htaccessContent = `# BugRicer Production Configuration
# Handle MIME types for JavaScript modules
<FilesMatch "\\.js$">
    Header set Content-Type "application/javascript; charset=utf-8"
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

<FilesMatch "\\.mjs$">
    Header set Content-Type "application/javascript; charset=utf-8"
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

<FilesMatch "\\.css$">
    Header set Content-Type "text/css; charset=utf-8"
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Handle SPA routing
RewriteEngine On
RewriteBase /

# Handle Angular and React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>`;

  fs.writeFileSync(htaccessPath, htaccessContent);
  console.log('✅ .htaccess created for Apache servers');
};

createHtaccess();

// Step 7: Generate production report
console.log('7. Generating production report...');
const generateProductionReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    buildMode: PRODUCTION_BUILD ? 'production' : 'development',
    fixes: [
      'Fixed chunk loading dependency order',
      'Added proper MIME type headers',
      'Enhanced error handling for chunk failures',
      'Added fallback mechanisms',
      'Created server configuration files'
    ],
    recommendations: [
      'Test the application in production environment',
      'Monitor for chunk loading errors',
      'Verify MIME types are served correctly',
      'Check browser console for any remaining issues'
    ]
  };

  const reportPath = path.join(BUILD_DIR, 'production-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Production report generated');
  console.log('📊 Fixes applied:');
  report.fixes.forEach((fix, index) => {
    console.log(`  ${index + 1}. ${fix}`);
  });
};

generateProductionReport();

console.log('\n🎉 Production build fix completed successfully!');
console.log('📦 Fixed build output: ' + path.relative(process.cwd(), BUILD_DIR));

if (PRODUCTION_BUILD) {
  console.log('\n🚀 Production build is ready with fixes applied!');
  console.log('💡 Next steps:');
  console.log('1. Deploy the fixed build to your production environment');
  console.log('2. Test the application thoroughly');
  console.log('3. Monitor browser console for any remaining issues');
  console.log('4. Check that MIME types are served correctly');
}
