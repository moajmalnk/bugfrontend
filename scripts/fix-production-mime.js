#!/usr/bin/env node

/**
 * Fix Production MIME Type Issues
 * This script ensures proper MIME types are set for all JavaScript files
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing Production MIME Type Issues...\n');

// Step 1: Build the application
console.log('1. Building application with proper module handling...');
process.env.NODE_ENV = 'production';
try {
  execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

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

// Step 3: Create enhanced vercel.json with comprehensive MIME type handling
console.log('3. Creating enhanced Vercel configuration...');
const vercelConfigPath = path.join(__dirname, '../vercel.json');
const vercelConfig = {
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://bugs.bugricer.com/$1",
      "permanent": true,
      "has": [
        {
          "type": "host",
          "value": "bugs.moajmalnk.in"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "unsafe-none"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*\\.js)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, HEAD, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        }
      ]
    },
    {
      "source": "/assets/(.*\\.mjs)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    },
    {
      "source": "/(.*\\.js)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "unsafe-none"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*\\.mjs)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/assets/(.*\\.css)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/css; charset=utf-8"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/html; charset=utf-8"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
};

fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
console.log('✅ Enhanced Vercel configuration created');

// Step 4: Create _headers file for Netlify compatibility
console.log('4. Creating _headers file for additional compatibility...');
const headersContent = `# BugRicer - MIME Type Headers

# JavaScript files
/assets/*.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

# ES Modules
/assets/*.mjs
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.mjs
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

# CSS files
/assets/*.css
  Content-Type: text/css; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable

# HTML files
/index.html
  Content-Type: text/html; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

# Security headers for all files
/*
  X-Content-Type-Options: nosniff
  Cross-Origin-Embedder-Policy: unsafe-none
  Cross-Origin-Opener-Policy: same-origin
`;

const headersPath = path.join(BUILD_DIR, '_headers');
fs.writeFileSync(headersPath, headersContent);
console.log('✅ _headers file created');

// Step 5: Verify all files are properly configured
console.log('5. Verifying configuration...');
const indexHtmlPath = path.join(BUILD_DIR, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Ensure proper script type attributes
  indexContent = indexContent.replace(
    /<script([^>]*?)>/g,
    '<script$1 type="module">'
  );
  
  fs.writeFileSync(indexHtmlPath, indexContent);
  console.log('✅ Index.html updated with proper module types');
}

console.log('\n🎉 MIME Type Fix Complete!');
console.log('\n📋 What was fixed:');
console.log('✅ Enhanced Vercel configuration with comprehensive MIME type headers');
console.log('✅ Added _headers file for additional server compatibility');
console.log('✅ Ensured all JavaScript files serve with application/javascript MIME type');
console.log('✅ Added proper cache control headers');
console.log('✅ Updated index.html with proper module type attributes');

console.log('\n🚀 Ready for deployment!');
console.log('Run: vercel --prod --yes');
