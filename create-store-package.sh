#!/bin/bash

# QR Super Generator - Simple Store Package Creator
# Creates a ZIP file ready for Chrome Web Store upload

echo "🚀 Creating Chrome Web Store Package..."
echo ""

# Step 1: Build the extension
echo "📦 Building extension..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix any errors and try again."
    exit 1
fi

# Step 1.5: Fix service worker issues
echo "🔧 Fixing service worker issues..."
./fix-service-worker.sh

# Step 1.6: Apply minimal service worker fix
echo "🔧 Applying minimal service worker..."
cp src/pages/background/minimal-worker.js dist_chrome/background.js
# Update manifest to use minimal worker
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist_chrome/manifest.json', 'utf8'));
manifest.background.service_worker = 'background.js';
fs.writeFileSync('dist_chrome/manifest.json', JSON.stringify(manifest, null, 2));
console.log('✅ Updated manifest to use minimal service worker');
"

# Step 2: Create ZIP package
echo "📁 Creating ZIP package..."
cd dist_chrome

# Create the ZIP file
zip -r ../qr-super-generator-store.zip . -x "*.DS_Store" "*/.git*" "*.map"

cd ..

# Step 3: Verify package
if [ -f "qr-super-generator-store.zip" ]; then
    size=$(du -h qr-super-generator-store.zip | cut -f1)
    echo ""
    echo "✅ Package created successfully!"
    echo "📦 File: qr-super-generator-store.zip"
    echo "📏 Size: $size"
    echo ""
    echo "🌐 Ready for Chrome Web Store upload!"
    echo ""
    echo "Next steps:"
    echo "1. Go to: https://chrome.google.com/webstore/developer/dashboard"
    echo "2. Click 'Add new item'"
    echo "3. Upload: qr-super-generator-store.zip"
    echo "4. Follow the guide in CHROME_WEB_STORE_GUIDE.md"
    echo ""
else
    echo "❌ Failed to create package!"
    exit 1
fi