# 🔥 QR Super Generator

**Advanced Chrome Extension for QR Code Generation with Analytics and Batch Processing**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-brightgreen.svg)](https://github.com/Rzhan16/qr-super-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🎯 **One-Click QR Generation** - Generate QR codes from any webpage instantly
- 📱 **Multiple QR Types** - URLs, WiFi credentials, contact cards (vCard), calendar events
- 🚀 **Batch Processing** - Generate QR codes for all open browser tabs
- 📊 **Analytics Dashboard** - Track usage and insights
- 🎨 **Customization** - Custom colors, sizes, and branding options
- 💾 **Export Options** - Download as PNG, PDF, or bulk ZIP files
- 🔒 **Privacy First** - All processing done locally, no data sent to servers

## 🚀 Quick Start

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Rzhan16/qr-super-generator.git
cd qr-super-generator

# Install dependencies
npm install

# Start development build
npm run dev

# Build for production
npm run build

# Package for Chrome Web Store
npm run package
```

### Load Extension in Chrome

1. Run `npm run build` to create the `dist` folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `dist` folder
5. The QR Super Generator icon should appear in your extensions toolbar

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Webpack 5
- **QR Generation**: QRCode.js
- **Chrome APIs**: Manifest V3 (tabs, storage, downloads)
- **Export**: JSZip + FileSaver.js

## 🏗️ Build Commands

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean

# Generate extension icons
npm run generate-icons

# Create ZIP package for Chrome Web Store
npm run package

# Type checking
npm run type-check
```

## 📖 Usage Guide

### Basic QR Generation
1. Click the extension icon in Chrome's toolbar
2. The popup will show the current page information
3. Click "Generate QR Code" to create a QR for the current page
4. Use "Custom Text/URL" section for custom content
5. Download or copy the generated QR code

### Keyboard Shortcuts
- **Ctrl+Shift+Q** (Windows/Linux) or **Cmd+Shift+Q** (Mac): Quick QR generation

### Advanced Features
- **WiFi QR Codes**: Share WiFi credentials
- **Contact QR Codes**: Generate vCard format
- **Calendar Events**: Create event QR codes
- **Batch Processing**: Generate QRs for multiple tabs
- **Custom Styling**: Adjust colors, sizes, error correction

## 📁 Project Structure

```
src/
├── manifest.json          # Chrome extension manifest V3
├── background/             # Service worker scripts
│   └── background.ts       # Extension lifecycle & commands
├── popup/                  # Main popup interface
│   ├── popup.html         # Popup shell with React mount
│   ├── popup.tsx          # Main React app component
│   ├── styles.css         # Tailwind CSS imports & custom styles
│   └── components/        # React components (future)
├── content/                # Content scripts
│   └── content.ts         # Page interaction & clipboard
├── utils/                  # Utility functions
│   ├── qr-generator.ts    # QRCode.js integration
│   └── chrome-apis.ts     # Chrome API wrappers
├── types/                  # TypeScript definitions
│   └── index.ts           # Comprehensive type definitions
├── icons/                  # Extension icons
│   ├── icon.svg           # Source SVG icon
│   ├── icon16.png         # 16x16 PNG
│   ├── icon32.png         # 32x32 PNG
│   ├── icon48.png         # 48x48 PNG
│   └── icon128.png        # 128x128 PNG
└── scripts/               # Build utilities
    └── generate-icons.js  # Icon generation script
```

## ⚙️ Configuration Files

- `webpack.config.js` - React + TypeScript + Tailwind bundling
- `tailwind.config.js` - Custom styling configuration
- `tsconfig.json` - TypeScript configuration for React
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `package.json` - Dependencies and build scripts

## 🎯 Roadmap

- [x] Project setup and configuration
- [ ] Core QR generation functionality
- [ ] React UI components
- [ ] Chrome extension integration
- [ ] Batch processing
- [ ] Analytics dashboard
- [ ] Chrome Web Store deployment
- [ ] Marketing and user acquisition

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Rzhan16/qr-super-generator)
- [Chrome Web Store](https://github.com/Rzhan16/qr-super-generator) (Coming Soon)
- [Issue Tracker](https://github.com/Rzhan16/qr-super-generator/issues)

---

**Built with ❤️ using Cursor AI** 