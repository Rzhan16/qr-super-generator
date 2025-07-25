#!/usr/bin/env node

/**
 * Icon Generation Script for QR Super Generator
 * Generates PNG icons from SVG source for Chrome extension
 */

const fs = require('fs');
const path = require('path');

// Simple PNG icon generation using Canvas API (Node.js)
// For production, you might want to use sharp or similar libraries

const iconSvg = `
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#3B82F6"/>
  <g fill="white">
    <rect x="16" y="16" width="24" height="24" rx="2"/>
    <rect x="20" y="20" width="16" height="16" rx="1" fill="#3B82F6"/>
    <rect x="24" y="24" width="8" height="8" fill="white"/>
    <rect x="88" y="16" width="24" height="24" rx="2"/>
    <rect x="92" y="20" width="16" height="16" rx="1" fill="#3B82F6"/>
    <rect x="96" y="24" width="8" height="8" fill="white"/>
    <rect x="16" y="88" width="24" height="24" rx="2"/>
    <rect x="20" y="92" width="16" height="16" rx="1" fill="#3B82F6"/>
    <rect x="24" y="96" width="8" height="8" fill="white"/>
    <rect x="48" y="16" width="4" height="4"/>
    <rect x="56" y="16" width="4" height="4"/>
    <rect x="64" y="16" width="4" height="4"/>
    <rect x="72" y="16" width="4" height="4"/>
    <rect x="16" y="48" width="4" height="4"/>
    <rect x="16" y="56" width="4" height="4"/>
    <rect x="16" y="64" width="4" height="4"/>
    <rect x="16" y="72" width="4" height="4"/>
    <rect x="48" y="48" width="32" height="4"/>
    <rect x="96" y="48" width="16" height="4"/>
    <rect x="48" y="56" width="4" height="4"/>
    <rect x="64" y="56" width="4" height="4"/>
    <rect x="80" y="56" width="4" height="4"/>
    <rect x="96" y="56" width="4" height="4"/>
    <rect x="48" y="64" width="12" height="4"/>
    <rect x="72" y="64" width="4" height="4"/>
    <rect x="88" y="64" width="4" height="4"/>
    <rect x="104" y="64" width="4" height="4"/>
    <rect x="48" y="72" width="4" height="4"/>
    <rect x="64" y="72" width="20" height="4"/>
    <rect x="96" y="72" width="4" height="4"/>
    <rect x="48" y="80" width="36" height="4"/>
    <rect x="96" y="80" width="16" height="4"/>
    <rect x="48" y="88" width="28" height="4"/>
    <rect x="48" y="96" width="4" height="4"/>
    <rect x="64" y="96" width="12" height="4"/>
    <rect x="48" y="104" width="28" height="4"/>
  </g>
</svg>`;

// Create base64 data URLs for different sizes
function createIconDataUrl(size) {
  const scaledSvg = iconSvg
    .replace('width="128"', `width="${size}"`)
    .replace('height="128"', `height="${size}"`)
    .replace('viewBox="0 0 128 128"', `viewBox="0 0 128 128"`);
  
  return `data:image/svg+xml;base64,${Buffer.from(scaledSvg).toString('base64')}`;
}

// Generate icon files
const iconSizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '../src/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating QR Super Generator icons...');

// For now, create placeholder files with data URLs
// In production, you'd use a proper image library like sharp
iconSizes.forEach(size => {
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // Create a simple text file with the data URL for now
  // This is a placeholder - you should use proper PNG generation
  const placeholderContent = `# Icon ${size}x${size} placeholder
# Replace this with actual PNG file
# Data URL: ${createIconDataUrl(size)}
# 
# To generate proper PNG files, use:
# npm install sharp
# 
# Then use sharp to convert SVG to PNG:
# const sharp = require('sharp');
# const svg = Buffer.from(iconSvg);
# await sharp(svg).resize(${size}, ${size}).png().toFile('icon${size}.png');
`;
  
  fs.writeFileSync(filepath, placeholderContent);
  console.log(`Created placeholder: ${filename}`);
});

console.log(`
Icons generated! 

IMPORTANT: These are placeholder files with instructions.
To create actual PNG files, you can:

1. Install an image processing library:
   npm install sharp

2. Use the SVG content provided to generate real PNGs
3. Or use online tools to convert the SVG to PNG files

For now, the extension will work with the manifest pointing to these files.
`);