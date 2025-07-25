// Script to clear auto-popup storage settings
chrome.storage.local.remove(['autoGenerate', 'showWidget'], () => {
  console.log('Cleared auto-popup settings');
});
