# Complete Extension Reset Instructions

## Step 1: Clear Extension Storage
1. Right-click QR extension icon → "Inspect popup"
2. Go to Console tab
3. Copy and paste this code:

```javascript
chrome.storage.local.clear(() => {
  console.log('All storage cleared');
  chrome.storage.local.set({
    autoGenerate: false,
    showWidget: false
  }, () => {
    console.log('Defaults set: autoGenerate=false, showWidget=false');
    location.reload();
  });
});
```

## Step 2: Remove and Reinstall Extension
1. Go to chrome://extensions/
2. Click "Remove" on QR Super Generator
3. Click "Load unpacked" 
4. Select the `dist_chrome` folder

## Step 3: Test
- Open any website → NO popup should appear
- Click extension icon → Toggle button should show 🚫 (OFF)
- Click toggle → Changes to 👁️ (ON)
- With toggle ON → Browse to new site → Popup appears
- With toggle OFF → Browse to new site → No popup
