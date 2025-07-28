// QR Super Generator - Minimal Background Script
console.log('🚀 QR Super Generator background script starting...');

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  
  try {
    // Initialize default settings
    const result = await chrome.storage.local.get(['autoGenerate', 'showWidget']);
    
    if (result.autoGenerate === undefined || result.showWidget === undefined) {
      await chrome.storage.local.set({
        autoGenerate: false,
        showWidget: false
      });
      console.log('📝 Default settings initialized');
    }
    
    // Create context menus
    await createContextMenus();
    
    console.log('✅ Extension setup completed');
  } catch (error) {
    console.error('❌ Extension setup failed:', error);
  }
});

// Create context menus
async function createContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    
    chrome.contextMenus.create({
      id: 'qr-generate-url',
      title: 'Generate QR Code for this page',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-selection',
      title: 'Generate QR Code for "%s"',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-link',
      title: 'Generate QR Code for this link',
      contexts: ['link']
    });
    
    console.log('✅ Context menus created');
  } catch (error) {
    console.error('❌ Failed to create context menus:', error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('📱 Context menu clicked:', info.menuItemId);
  
  try {
    let textToGenerate = '';
    let qrType = 'text';
    
    switch (info.menuItemId) {
      case 'qr-generate-url':
        textToGenerate = tab?.url || '';
        qrType = 'url';
        break;
      case 'qr-generate-selection':
        textToGenerate = info.selectionText || '';
        qrType = 'text';
        break;
      case 'qr-generate-link':
        textToGenerate = info.linkUrl || '';
        qrType = 'url';
        break;
    }
    
    if (textToGenerate && tab?.id) {
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'GENERATE_QR',
          text: textToGenerate
        });
        console.log('✅ QR generation message sent');
      } catch (error) {
        console.log('⚠️ Could not send message to tab (expected if no content script)');
        
        // Store for popup to pick up
        await chrome.storage.local.set({
          pendingQRGeneration: {
            text: textToGenerate,
            type: qrType,
            timestamp: Date.now(),
            source: 'context-menu'
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Context menu action failed:', error);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type);
  
  switch (message.type) {
    case 'GET_CURRENT_TAB':
      getCurrentTab(sendResponse);
      return true; // Keep message channel open
      
    case 'TRACK_EVENT':
      console.log('📊 Event:', message.eventName, message.eventData);
      break;
      
    default:
      console.log('⚠️ Unknown message type:', message.type);
  }
});

// Get current tab info
async function getCurrentTab(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    sendResponse({
      success: true,
      tab: tab ? {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      } : null
    });
    
    console.log('✅ Current tab info provided');
  } catch (error) {
    console.error('❌ Failed to get current tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('✅ QR Super Generator background script ready'); 