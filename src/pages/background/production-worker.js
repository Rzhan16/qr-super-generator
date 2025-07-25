/**
 * QR Super Generator - Production Service Worker
 * 
 * Chrome extension service worker optimized for production
 * - No ES modules or imports
 * - No DOM/localStorage dependencies  
 * - Proper error handling for message passing
 * - Synchronous event listener registration
 */

console.log('🚀 QR Super Generator service worker starting...');

// Global state management using chrome.storage instead of variables
let isInitialized = false;

// Extension installation and startup - register listeners SYNCHRONOUSLY
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  
  try {
    await initializeExtension();
    console.log('✅ Extension initialization completed');
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('🔧 Extension startup');
  try {
    await initializeExtension();
  } catch (error) {
    console.error('❌ Extension startup failed:', error);
  }
});

// Register all event listeners SYNCHRONOUSLY at top level
registerEventListeners();

// Initialize extension data and context menus
async function initializeExtension() {
  if (isInitialized) return;
  
  try {
    // Initialize default settings using chrome.storage.local (NOT localStorage)
    await initializeStorage();
    
    // Setup context menus
    await setupContextMenus();
    
    isInitialized = true;
    console.log('✅ Extension fully initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize extension:', error);
    throw error;
  }
}

// Initialize storage with default values (replaces localStorage)
async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get([
      'autoGenerate', 
      'showWidget', 
      'settings',
      'qrHistory'
    ]);
    
    const defaults = {
      autoGenerate: true,
      showWidget: true,
      qrHistory: [],
      settings: {
        defaultSize: 256,
        defaultErrorCorrection: 'M',
        defaultColors: {
          dark: '#9333ea',
          light: '#ffffff'
        },
        theme: 'dark'
      }
    };

    const updates = {};
    let needsUpdate = false;

    Object.keys(defaults).forEach(key => {
      if (result[key] === undefined) {
        updates[key] = defaults[key];
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await chrome.storage.local.set(updates);
      console.log('📝 Default settings initialized');
    }

  } catch (error) {
    console.error('❌ Failed to initialize storage:', error);
    throw error;
  }
}

// Setup context menus with error handling
async function setupContextMenus() {
  try {
    // Remove existing menus first
    await chrome.contextMenus.removeAll();
    
    // Create main menu
    chrome.contextMenus.create({
      id: 'qr-generator-main',
      title: 'QR Super Generator',
      contexts: ['page', 'selection', 'link']
    });
    
    // Create sub-menus
    chrome.contextMenus.create({
      id: 'qr-generate-url',
      parentId: 'qr-generator-main',
      title: '📄 Current Page QR',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-selection',
      parentId: 'qr-generator-main',
      title: '📝 Selected Text QR',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-link',
      parentId: 'qr-generator-main',
      title: '🔗 Link QR',
      contexts: ['link']
    });

    chrome.contextMenus.create({
      id: 'qr-open-popup',
      parentId: 'qr-generator-main',
      title: '⚡ Open QR Generator',
      contexts: ['page', 'selection', 'link']
    });
    
    console.log('✅ Context menus created');
    
  } catch (error) {
    console.error('❌ Failed to setup context menus:', error);
    throw error;
  }
}

// Register all event listeners synchronously at top level
function registerEventListeners() {
  // Context menu click handler
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
  
  // Message handler
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Tab updates for auto-generation
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  
  // Keep alive alarm
  if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener(handleAlarm);
    // Create keep-alive alarm
    chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
  }
  
  console.log('✅ Event listeners registered');
}

// Handle context menu clicks with proper error handling
async function handleContextMenuClick(info, tab) {
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
      case 'qr-open-popup':
        // Store data for popup
        await chrome.storage.local.set({
          pendingQRGeneration: {
            text: info.selectionText || info.linkUrl || tab?.url || '',
            type: info.linkUrl ? 'url' : (info.selectionText ? 'text' : 'url'),
            timestamp: Date.now(),
            source: 'context-menu'
          }
        });
        return;
    }
    
    if (textToGenerate) {
      console.log(`🎯 Processing QR request: ${textToGenerate.substring(0, 50)}...`);
      
      // Store request for popup
      await chrome.storage.local.set({
        pendingQRGeneration: {
          text: textToGenerate,
          type: qrType,
          timestamp: Date.now(),
          source: 'context-menu'
        }
      });
      
      // Try to send to content script (with error handling)
      await sendMessageToTab(tab?.id, {
        type: 'GENERATE_QR',
        text: textToGenerate
      });
      
      console.log('✅ QR request processed');
    }
  } catch (error) {
    console.error('❌ Context menu action failed:', error);
  }
}

// Safe message sending with proper error handling
async function sendMessageToTab(tabId, message) {
  if (!tabId) return;
  
  try {
    // Check if tab exists and can receive messages
    const tab = await chrome.tabs.get(tabId);
    
    // Don't send to chrome:// pages or other restricted URLs
    if (!tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('moz-extension://') ||
        tab.url.startsWith('about:')) {
      console.log('⏭️ Skipping message to restricted tab:', tab.url);
      return;
    }
    
    await chrome.tabs.sendMessage(tabId, message);
    console.log('✅ Message sent to tab successfully');
    
  } catch (error) {
    // This is expected for tabs that don't have content scripts
    console.log('⚠️ Could not send message to tab (expected if no content script):', error.message);
  }
}

// Handle runtime messages with comprehensive error handling
function handleMessage(message, sender, sendResponse) {
  console.log('📨 Background received message:', message.type);

  // Handle async operations properly
  const processMessage = async () => {
    try {
      switch (message.type) {
        case 'GET_CURRENT_TAB':
          return await getCurrentTab();
          
        case 'SHOW_NOTIFICATION':
          await showNotification(message);
          return { success: true };
          
        case 'TRACK_EVENT':
          console.log('📊 Event tracked:', message.eventName);
          return { success: true };
          
        case 'STORE_QR_DATA':
          await storeQRInHistory(message.qrData);
          return { success: true };
          
        case 'GENERATE_QR_CONTENT':
          return await generateQRForContent(message);
          
        default:
          console.warn('⚠️ Unknown message type:', message.type);
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('❌ Message handler error:', error);
      return { success: false, error: error.message };
    }
  };

  // Execute async handler and send response
  processMessage().then(sendResponse).catch(error => {
    console.error('❌ Message processing failed:', error);
    sendResponse({ success: false, error: error.message });
  });

  // Return true to indicate async response
  return true;
}

// Get current tab with error handling
async function getCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    return {
      success: true,
      tab: currentTab ? {
        id: currentTab.id,
        url: currentTab.url,
        title: currentTab.title,
        favIconUrl: currentTab.favIconUrl
      } : null
    };
  } catch (error) {
    console.error('❌ Failed to get current tab:', error);
    return { success: false, error: error.message };
  }
}

// Show notification with error handling
async function showNotification(message) {
  try {
    if (chrome.notifications) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: message.title || 'QR Super Generator',
        message: message.message || 'Action completed'
      });
      console.log('✅ Notification shown');
    }
  } catch (error) {
    console.error('❌ Failed to show notification:', error);
    throw error;
  }
}

// Store QR data in history using chrome.storage.local
async function storeQRInHistory(qrData) {
  try {
    const result = await chrome.storage.local.get(['qrHistory']);
    const history = result.qrHistory || [];
    
    // Add new QR data with timestamp
    const historyItem = {
      ...qrData,
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    // Keep only last 100 items
    history.unshift(historyItem);
    if (history.length > 100) {
      history.length = 100;
    }
    
    await chrome.storage.local.set({ qrHistory: history });
    console.log('✅ QR data stored in history');
    
  } catch (error) {
    console.error('❌ Failed to store QR in history:', error);
    throw error;
  }
}

// Handle tab updates for auto-generation
async function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const result = await chrome.storage.local.get(['autoGenerate', 'showWidget']);
      
      if (result.autoGenerate && result.showWidget && 
          (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        
        // Small delay to ensure content script is ready
        setTimeout(async () => {
          await sendMessageToTab(tabId, {
            type: 'AUTO_GENERATE_QR',
            text: tab.url
          });
        }, 1500); // Longer delay for reliability
      }
    } catch (error) {
      console.log('⚠️ Auto-generation check failed:', error.message);
    }
  }
}

// Generate QR code for content script
async function generateQRForContent(message) {
  try {
    console.log('🎯 Generating QR for content script:', message.text?.substring(0, 50));
    
    // Since service workers can't easily generate QR codes (no DOM/Canvas),
    // we'll return a simple response that tells the content script to generate locally
    // or we could store the request for the popup to handle
    
    const qrData = {
      text: message.text,
      options: message.options || {},
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    // Store the QR request for the popup to potentially use
    await chrome.storage.local.set({
      pendingQRGeneration: qrData
    });
    
    // For now, return a success but indicate content script should handle generation
    return {
      success: true,
      shouldGenerateLocally: true,
      qrData: qrData,
      message: 'QR generation should be handled by content script locally'
    };
    
  } catch (error) {
    console.error('❌ Content QR generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle alarms for keep-alive
function handleAlarm(alarm) {
  if (alarm.name === 'keepAlive') {
    // Perform minimal activity to keep service worker alive
    chrome.storage.local.get(['keepAlive']).then(() => {
      console.debug('💓 Keep alive ping');
    }).catch(() => {
      // Ignore errors in keep-alive
    });
  }
}

console.log('✅ QR Super Generator service worker ready');