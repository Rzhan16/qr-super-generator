// Debug script to check extension state
// Copy and paste this into the extension popup console

console.log('=== QR Extension Debug ===');

// Check current storage
chrome.storage.local.get(null, (data) => {
  console.log('Current storage:', data);
});

// Clear all storage
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
  
  // Set explicit defaults
  chrome.storage.local.set({
    autoGenerate: false,
    showWidget: false
  }, () => {
    console.log('New defaults set');
    
    // Verify
    chrome.storage.local.get(null, (data) => {
      console.log('After reset:', data);
    });
  });
});
