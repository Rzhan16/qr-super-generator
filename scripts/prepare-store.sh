#!/bin/bash

# QR Super Generator - Chrome Web Store Preparation Script
echo "🚀 Preparing QR Super Generator for Chrome Web Store..."

# Step 1: Clean build
echo "🧹 Cleaning previous builds..."
npm run clean

# Step 2: Build production version
echo "🏗️ Building production version..."
npm run build

# Step 3: Remove console.log statements from built files (basic approach)
echo "🔇 Removing console.log statements..."
if command -v sed >/dev/null 2>&1; then
    find dist_chrome -name "*.js" -exec sed -i '' 's/console\.log[^;]*;//g' {} \;
    echo "✅ Console logs removed"
else
    echo "⚠️ sed not available - manual console.log removal needed"
fi

# Step 4: Validate manifest
echo "🔍 Validating manifest..."
if [ -f "dist_chrome/manifest.json" ]; then
    echo "✅ Manifest exists"
    
    # Check for required fields
    if grep -q '"version"' dist_chrome/manifest.json; then
        echo "✅ Version specified"
    else
        echo "❌ Missing version in manifest"
    fi
    
    if grep -q '"icons"' dist_chrome/manifest.json; then
        echo "✅ Icons specified"
    else
        echo "❌ Missing icons in manifest"
    fi
else
    echo "❌ Manifest not found!"
    exit 1
fi

# Step 5: Check icon files
echo "🎨 Checking icon files..."
ICONS=("icon-16.png" "icon-48.png" "icon-128.png")
for icon in "${ICONS[@]}"; do
    if [ -f "dist_chrome/$icon" ]; then
        echo "✅ $icon exists"
    else
        echo "❌ Missing $icon"
    fi
done

# Step 6: Create store package
echo "📦 Creating store package..."
cd dist_chrome
zip -r ../qr-super-generator-store.zip . -x "*.DS_Store" "*.map"
cd ..

echo "🎉 Store package created: qr-super-generator-store.zip"

# Step 7: Show next steps
echo ""
echo "📋 NEXT STEPS FOR CHROME WEB STORE:"
echo "1. Create screenshots (5 required, 1280x800px)"
echo "2. Write a 132-character summary"  
echo "3. Upload qr-super-generator-store.zip to Chrome Web Store"
echo "4. Set up privacy policy URL"
echo "5. Add promotional images (440x280px, 920x680px)"
echo ""
echo "📁 Files ready in: dist_chrome/"
echo "📦 Store package: qr-super-generator-store.zip" 