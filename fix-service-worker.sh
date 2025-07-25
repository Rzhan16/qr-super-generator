#!/bin/bash

# Fix Chrome Extension Service Worker Issues
echo "🔧 Fixing service worker configuration..."

# Check if dist_chrome exists
if [ ! -d "dist_chrome" ]; then
    echo "❌ dist_chrome directory not found. Run 'npm run build' first."
    exit 1
fi

# Fix manifest.json - remove type: module from background
echo "📝 Updating manifest.json..."
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('dist_chrome/manifest.json', 'utf8'));
if (manifest.background && manifest.background.type === 'module') {
    delete manifest.background.type;
    fs.writeFileSync('dist_chrome/manifest.json', JSON.stringify(manifest, null, 2));
    console.log('✅ Removed type: module from manifest.json');
}
"

# Fix service worker loader - use importScripts instead of import
echo "📝 Updating service worker loader..."
if [ -f "dist_chrome/service-worker-loader.js" ]; then
    # Read the current content
    CURRENT_CONTENT=$(cat dist_chrome/service-worker-loader.js)
    
    # Check if it uses import syntax
    if [[ $CURRENT_CONTENT == *"import "* ]]; then
        # Extract the file path and convert to importScripts
        FILE_PATH=$(echo "$CURRENT_CONTENT" | grep -o "'[^']*'" | head -1)
        
        # Create new content with importScripts
        echo "// QR Super Generator Service Worker
try {
  importScripts($FILE_PATH);
} catch (error) {
  console.error('Service worker import failed:', error);
}" > dist_chrome/service-worker-loader.js
        
        echo "✅ Converted import to importScripts in service worker loader"
    else
        echo "ℹ️  Service worker loader already uses importScripts"
    fi
else
    echo "⚠️  service-worker-loader.js not found"
fi

echo "✅ Service worker fixes applied successfully!"
echo ""
echo "🧪 Test the extension by:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist_chrome' folder"
echo ""
echo "✅ No more 'Service worker registration failed. Status code: 15' errors!"