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

## 📁 Project Structure

```
src/
├── manifest.json          # Chrome extension manifest
├── background/             # Background scripts
│   └── background.ts
├── popup/                  # Main popup interface
│   ├── popup.html
│   ├── popup.tsx
│   └── components/
├── content/                # Content scripts
│   └── content.ts
├── utils/                  # Utility functions
│   ├── qr-generator.ts
│   ├── storage.ts
│   └── analytics.ts
├── types/                  # TypeScript definitions
│   └── index.ts
└── icons/                  # Extension icons
```

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