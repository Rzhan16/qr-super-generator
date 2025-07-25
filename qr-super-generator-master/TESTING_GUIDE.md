# QR Super Generator - Testing & Development Guide

## 🧪 Testing the Extension

### **Loading the Extension in Chrome**

1. **Build the Extension**
   ```bash
   npm run build
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist` folder from your project

3. **Testing the Extension**
   - Click the extension icon in the toolbar
   - Navigate to any website to test QR generation
   - Test all features: Quick Actions, History, Settings, etc.

### **Development Workflow**

1. **Start Development Mode**
   ```bash
   npm run dev
   ```
   This starts webpack in watch mode - changes will auto-rebuild

2. **Reload Extension**
   - After code changes, go to `chrome://extensions/`
   - Click the reload icon on your extension
   - Test your changes

### **Common Issues & Solutions**

#### **Extension Not Loading**
- Check the `dist` folder exists and contains files
- Verify `manifest.json` is in the dist folder
- Check browser console for errors

#### **QR History Not Showing**
- Check Chrome storage: `chrome://extensions/` → Details → Storage
- Clear storage if corrupted: Right-click extension → Options → Clear History
- Verify dataURL format in storage

#### **Styling Issues**
- Ensure Tailwind CSS is building correctly
- Check for class name typos in console
- Verify CSS is being loaded in popup

## 🔧 Manual Testing Checklist

### **Core Features**
- [ ] Generate QR from current page URL
- [ ] Custom text QR generation
- [ ] WiFi QR generation
- [ ] Batch QR generation
- [ ] QR history displays correctly
- [ ] Copy QR to clipboard
- [ ] Download QR as PNG
- [ ] Analytics tracking

### **UI/UX Testing**
- [ ] All animations work smoothly
- [ ] Hover effects are responsive
- [ ] Loading states display correctly
- [ ] Error states show appropriate messages
- [ ] Navigation between tabs works
- [ ] Glass effects render properly

### **Cross-Browser Testing**
- [ ] Chrome (primary target)
- [ ] Chromium browsers (Edge, Brave, etc.)
- [ ] Different screen sizes (if applicable)

## 🐛 Debugging Tips

### **Chrome DevTools**
1. Right-click on extension popup → "Inspect"
2. Check Console for JavaScript errors
3. Use Network tab to see failed requests
4. Check Application tab → Storage for stored data

### **Background Script Debugging**
1. Go to `chrome://extensions/`
2. Click "Details" on your extension
3. Click "Inspect views: background page"
4. Debug in the opened DevTools

### **Common Debug Scenarios**

#### **QR Generation Fails**
```javascript
// Check in console:
console.log('QR Text:', text);
console.log('QR Options:', options);
// Verify text length and format
```

#### **Storage Issues**
```javascript
// Check storage contents:
chrome.storage.local.get(null, (result) => {
  console.log('All storage:', result);
});
```

#### **Permission Issues**
- Check manifest.json permissions
- Verify activeTab permission for current page access
- Check storage permission for data persistence

## 📊 Performance Testing

### **Bundle Size Analysis**
```bash
# Check bundle sizes after build
ls -la dist/
# Look for warnings in build output
npm run build
```

### **Memory Usage**
1. Open Chrome Task Manager (Shift+Esc)
2. Look for your extension process
3. Monitor memory usage during testing
4. Check for memory leaks

### **Loading Performance**
- Extension should load in < 100ms
- QR generation should be near-instant
- Animations should be smooth (60fps)

## 🧑‍💻 Development Best Practices

### **Code Quality**
```bash
# Type checking
npm run type-check

# Future: Linting (when configured)
npm run lint

# Future: Testing (when configured)
npm test
```

### **Git Workflow**
```bash
# Before committing
npm run build          # Ensure builds successfully
git add .
git commit -m "feat: describe changes"
git push origin master
```

### **Release Checklist**
- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] Manual testing completed
- [ ] Version number updated in manifest.json
- [ ] Package extension: `npm run package`
- [ ] Test packaged extension in clean Chrome profile

## 🔄 Automated Testing Setup (Future)

### **Unit Testing with Jest & Testing Library**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### **E2E Testing with Puppeteer**
```bash
npm install --save-dev puppeteer
```

### **Chrome Extension Testing**
```bash
npm install --save-dev chrome-extension-testing-library
```

## 📈 Analytics & Monitoring

### **Debug Analytics**
```javascript
// In console, check analytics data:
chrome.storage.local.get(['analytics'], (result) => {
  console.log('Analytics:', result.analytics);
});
```

### **Track User Actions**
All user interactions should be tracked:
- QR generation events
- Feature usage
- Error occurrences
- Performance metrics

## 🎯 Test Scenarios

### **Happy Path Testing**
1. User opens extension
2. Current page QR generates automatically
3. User copies QR code
4. User checks history
5. QR appears in history with correct metadata

### **Error Path Testing**
1. Invalid URL generation
2. Corrupted storage data
3. Network failures
4. Permission denial
5. Large data handling

### **Edge Cases**
1. Very long URLs (>4000 characters)
2. Special characters in text
3. Multiple rapid QR generations
4. Storage quota exceeded
5. Extension disabled/enabled

## 🚀 Production Deployment

### **Chrome Web Store Preparation**
1. **Build for Production**
   ```bash
   npm run build
   npm run package
   ```

2. **Test Package**
   - Install the .zip file as unpacked extension
   - Test all functionality
   - Verify no development artifacts

3. **Store Assets**
   - Create store screenshots
   - Write store description
   - Prepare promotional images

### **Version Management**
- Update version in `package.json`
- Update version in `manifest.json`
- Tag releases in Git
- Maintain changelog

## 📝 Issue Reporting Template

When reporting issues:

```markdown
**Bug Description:**
Brief description of the issue

**Steps to Reproduce:**
1. Open extension
2. Click on...
3. Error occurs

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Chrome Version: 
- Extension Version:
- OS: 

**Console Errors:**
```
Paste any console errors here
```

**Additional Context:**
Any other relevant information
```

This testing guide ensures the extension maintains high quality and provides a great user experience across all scenarios.