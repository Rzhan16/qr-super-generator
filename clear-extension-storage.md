# Clear Extension Storage

To completely clear the extension's cached settings:

1. Go to chrome://extensions/
2. Click on "QR Super Generator" details
3. Go to "Storage" tab (or right-click extension icon → Inspect popup → Application tab → Storage)
4. Delete all chrome.storage.local entries
5. Reload the extension

Or run this in the extension's console:
chrome.storage.local.clear()
