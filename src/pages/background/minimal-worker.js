/**
 * QR Super Generator - Minimal Service Worker
 * 
 * Chrome extension service worker without ES modules, DOM APIs, or complex dependencies
 * Handles basic extension functionality only
 */

console.log('🚀 QR Super Generator service worker loaded');

// Extension installation and startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  
  try {
    await setupContextMenus();
    await initializeExtensionData();
    console.log('✅ Extension setup completed');
  } catch (error) {
    console.error('❌ Extension setup failed:', error);
  }
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔧 Extension startup');
});

// Initialize extension data
async function initializeExtensionData() {
  try {
    const result = await chrome.storage.local.get(['autoGenerate', 'showWidget', 'settings']);
    
    // Set default values if not present
    const defaults = {
      autoGenerate: false,  // Disable auto-popup by default
      showWidget: false,    // Disable auto-widget by default
      settings: {
        defaultSize: 256,
        defaultErrorCorrection: 'M',
        defaultColors: {
          dark: '#9333ea',
          light: '#ffffff'
        },
        theme: 'dark',
        debugMode: false
      }
    };

    let needsUpdate = false;
    const updates = {};

    Object.keys(defaults).forEach(key => {
      if (result[key] === undefined) {
        updates[key] = defaults[key];
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await chrome.storage.local.set(updates);
      console.log('📝 Default settings initialized:', updates);
    }

  } catch (error) {
    console.error('❌ Failed to initialize extension data:', error);
  }
}

// Context menu setup
async function setupContextMenus() {
  try {
    // Remove all existing context menus first
    await chrome.contextMenus.removeAll();
    console.log('🗑️ Cleared existing context menus');
    
    // Create main context menu
    chrome.contextMenus.create({
      id: 'qr-generator-main',
      title: 'QR Super Generator',
      contexts: ['page', 'selection', 'link', 'image']
    });
    
    // Create sub-menus for different types
    chrome.contextMenus.create({
      id: 'qr-generate-url',
      parentId: 'qr-generator-main',
      title: '📄 Current Page URL',
      contexts: ['page']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-selection',
      parentId: 'qr-generator-main',
      title: '📝 Selected Text',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'qr-generate-link',
      parentId: 'qr-generator-main',
      title: '🔗 Link URL',
      contexts: ['link']
    });

    chrome.contextMenus.create({
      id: 'qr-show-widget',
      parentId: 'qr-generator-main',
      title: '🎯 Show QR Widget',
      contexts: ['page']
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
  }
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('📱 Context menu clicked:', info.menuItemId, info);
  
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
      case 'qr-show-widget':
        // Send message to content script to show widget
        if (tab?.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_WIDGET' });
            console.log('✅ Widget show message sent');
          } catch (error) {
            console.warn('⚠️ Failed to send widget message:', error);
          }
        }
        return;
      case 'qr-open-popup':
        // Store data for popup to pick up
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
      console.log(`🎯 Generating QR for: ${textToGenerate.substring(0, 50)}...`);
      
      // Store the QR request for the popup
      await chrome.storage.local.set({
        pendingQRGeneration: {
          text: textToGenerate,
          type: qrType,
          timestamp: Date.now(),
          source: 'context-menu'
        }
      });
      
      // Also try to send to content script for immediate display
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'GENERATE_QR',
            text: textToGenerate
          });
          console.log('✅ QR generation message sent to content script');
        } catch (error) {
          console.warn('⚠️ Failed to send message to content script:', error);
        }
      }
      
      console.log('✅ QR generation request stored');
    }
  } catch (error) {
    console.error('❌ Context menu action failed:', error);
  }
});

// Message handling for communication between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type, sender);

  switch (message.type) {
    case 'GET_CURRENT_TAB':
      handleGetCurrentTab(sendResponse);
      return true;

    case 'SHOW_NOTIFICATION':
      handleShowNotification(message);
      break;

    case 'TRACK_EVENT':
      console.log('📊 Event:', message.eventName, message.eventData);
      break;

    default:
      console.warn('⚠️ Unknown message type:', message.type);
  }
});

// Handle current tab requests
async function handleGetCurrentTab(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    sendResponse({
      success: true,
      tab: currentTab ? {
        id: currentTab.id,
        url: currentTab.url,
        title: currentTab.title,
        favIconUrl: currentTab.favIconUrl
      } : null
    });

    console.log('✅ Current tab info provided');
    
  } catch (error) {
    console.error('❌ Failed to get current tab:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle notification requests
async function handleShowNotification(message) {
  try {
    if (chrome.notifications) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: message.title || 'QR Super Generator',
        message: message.message || 'Action completed'
      });
      
      console.log('✅ Notification shown:', message.title);
    }
  } catch (error) {
    console.error('❌ Failed to show notification:', error);
  }
}

// Tab updates - monitor for URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('📄 Tab updated:', tab.url);
    
    // Check if auto-generation is enabled
    try {
      const result = await chrome.storage.local.get(['autoGenerate', 'showWidget']);
      if (result.autoGenerate && result.showWidget && 
          (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        
        // Small delay to ensure content script is ready
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tabId, {
              type: 'AUTO_GENERATE_QR',  // Use AUTO_GENERATE_QR for auto-generation
              text: tab.url
            });
          } catch (error) {
            // Content script might not be ready yet, ignore
            console.log('⚠️ Content script not ready for auto-generation');
          }
        }, 1000);
      }
    } catch (error) {
      console.warn('⚠️ Failed to check auto-generation settings:', error);
    }
  }
});

// Keep service worker alive with periodic activity
if (chrome.alarms) {
  chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
      console.debug('💓 Keep alive ping');
    }
  });
}

console.log('✅ Background script initialization completed');