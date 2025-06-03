#!/bin/bash

# Deployment script for Bug Tracker application
# This script handles version updates and provides deployment instructions

set -e

echo "🚀 Bug Tracker Deployment Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if node is available for version update
if command -v node &> /dev/null; then
    print_step "Updating version.json..."
    node update-version.js
    NEW_VERSION=$(cat frontend/public/version.json | grep '"version"' | cut -d'"' -f4)
    print_status "New version: $NEW_VERSION"
else
    print_warning "Node.js not found. Version.json will not be updated automatically."
    print_warning "Please update frontend/public/version.json manually before deployment."
fi

echo ""
print_step "Deployment Instructions"
echo "======================="

echo ""
echo "📦 FRONTEND DEPLOYMENT:"
echo "----------------------"
echo "1. Build the frontend:"
echo "   cd frontend"
echo "   npm run build"
echo ""
echo "2. Upload the 'dist' folder contents to your web server"
echo "   - Make sure version.json is included in the upload"
echo "   - Ensure all static assets are uploaded"
echo ""
echo "3. Update your web server configuration:"
echo "   - Set up proper caching headers for static assets"
echo "   - Configure cache-control for version.json (no-cache)"
echo ""

echo "🖥️  BACKEND DEPLOYMENT:"
echo "----------------------"
echo "1. Upload backend files to your server:"
echo "   rsync -av --exclude='.git' backend/ user@server:/path/to/backend/"
echo ""
echo "2. Ensure database connection is configured in BaseAPI.php"
echo ""
echo "3. Test the health endpoint:"
echo "   curl https://your-backend-url/api/health.php"
echo ""

echo "🔧 POST-DEPLOYMENT CHECKLIST:"
echo "-----------------------------"
echo "□ Frontend application loads correctly"
echo "□ Backend health endpoint returns 200"
echo "□ Version.json is accessible and returns correct version"
echo "□ User authentication works"
echo "□ API calls succeed"
echo "□ Error boundaries work (test with network disconnect)"
echo "□ Inactivity timeout works (wait 5 minutes)"
echo "□ Cache busting works (hard refresh shows new version)"
echo ""

echo "🚨 ROLLBACK INSTRUCTIONS:"
echo "-------------------------"
echo "If issues occur after deployment:"
echo "1. Restore previous frontend build from backup"
echo "2. Restore previous backend files if changed"
echo "3. Update version.json to previous version if needed"
echo "4. Clear CDN/proxy caches if applicable"
echo ""

print_status "Deployment preparation complete!"
print_warning "Remember to test thoroughly in staging before production deployment."

# Create a deployment log entry
DEPLOY_LOG="deployment.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Deployment prepared for version: $NEW_VERSION" >> "$DEPLOY_LOG"
print_status "Deployment logged to $DEPLOY_LOG" 