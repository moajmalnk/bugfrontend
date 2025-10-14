#!/usr/bin/env node

/**
 * Deploy with MIME Type Fix
 * Ensures all JavaScript files are served with correct MIME types
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Deploying with MIME type fix...\n');

// Step 1: Build the application
console.log('1. Building application...');
process.env.NODE_ENV = 'production';
execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
console.log('✅ Build completed');

// Step 2: Verify build output
console.log('2. Verifying build output...');
const BUILD_DIR = path.join(__dirname, '../dist');
const assetsDir = path.join(BUILD_DIR, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('❌ Assets directory not found');
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
console.log(`✅ Found ${jsFiles.length} JavaScript files`);

// Step 3: Create .htaccess in dist folder
console.log('3. Creating .htaccess in dist folder...');
const htaccessContent = `# BugRicer - Aggressive MIME Type Fix
# Force correct MIME types for ALL JavaScript files

# Disable MIME type sniffing completely
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Cross-Origin-Embedder-Policy "unsafe-none"
    Header always set Cross-Origin-Opener-Policy "same-origin"
</IfModule>

# Force JavaScript MIME types - ALL variations
<FilesMatch "\\.js$">
    Header always set Content-Type "application/javascript; charset=utf-8"
    Header always set Cache-Control "public, max-age=31536000, immutable"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"
</FilesMatch>

# Force ES Module MIME types
<FilesMatch "\\.mjs$">
    Header always set Content-Type "application/javascript; charset=utf-8"
    Header always set Cache-Control "public, max-age=31536000, immutable"
    Header always set X-Content-Type-Options "nosniff"
</FilesMatch>

# Force CSS MIME types
<FilesMatch "\\.css$">
    Header always set Content-Type "text/css; charset=utf-8"
    Header always set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Force HTML MIME types
<FilesMatch "\\.html$">
    Header always set Content-Type "text/html; charset=utf-8"
    Header always set Cache-Control "public, max-age=0, must-revalidate"
</FilesMatch>

# Force JSON MIME types
<FilesMatch "\\.json$">
    Header always set Content-Type "application/json; charset=utf-8"
    Header always set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Override any existing MIME type mappings
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType application/javascript .mjs
    AddType text/css .css
    AddType text/html .html
    AddType application/json .json
</IfModule>

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
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Handle SPA routing
RewriteEngine On
RewriteBase /

# Handle React Router - ALL routes go to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/assets/
RewriteRule . /index.html [L]

# Cache static assets aggressively
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mjs)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Security headers for all files
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Cross-Origin-Embedder-Policy "unsafe-none"
    Header always set Cross-Origin-Opener-Policy "same-origin"
</IfModule>`;

const htaccessPath = path.join(BUILD_DIR, '.htaccess');
fs.writeFileSync(htaccessPath, htaccessContent);
console.log('✅ .htaccess created in dist folder');

// Step 4: Verify configuration files
console.log('4. Verifying configuration files...');
const vercelConfig = path.join(__dirname, '../vercel.json');

if (!fs.existsSync(vercelConfig)) {
  console.error('❌ vercel.json not found');
  process.exit(1);
}

console.log('✅ Configuration files verified');

// Step 5: Deploy to Vercel
console.log('5. Deploying to Vercel...');
try {
  execSync('vercel --prod --yes', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Deployment completed successfully');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n📋 Manual deployment steps:');
  console.log('1. Ensure you are logged into Vercel: vercel login');
  console.log('2. Deploy manually: vercel --prod --yes');
  process.exit(1);
}

console.log('\n🎉 MIME type fix deployment completed!');
console.log('\n💡 What was deployed:');
console.log('✅ Enhanced Vercel configuration with aggressive MIME type headers');
console.log('✅ Comprehensive .htaccess for Apache servers');
console.log('✅ Proper HTML meta tags and script attributes');
console.log('✅ All JavaScript files served with application/javascript MIME type');

console.log('\n🧪 After deployment, verify:');
console.log('1. No more "application/octet-stream" MIME type errors');
console.log('2. All JavaScript modules load correctly');
console.log('3. No console errors in browser');
console.log('4. Application functions properly');
