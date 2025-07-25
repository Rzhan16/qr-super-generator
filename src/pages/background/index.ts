/**
 * QR Super Generator - Background Script
 * 
 * Handles extension lifecycle, context menus, message passing,
 * and coordination between content scripts and popup
 */

import { debug } from '../../utils/debug';
// Dynamic import for analytics worker to avoid module loading issues
// import { analyticsWorker } from '../../background/analytics-worker';

console.log('🚀 QR Super Generator background script loaded');

// Initialize debug system
debug.info('Background', '🔧 Background script initializing');

// Extension installation and startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  
  try {
    await setupContextMenus();
    await initializeExtensionData();
    
    // Initialize analytics worker with dynamic import
    try {
      const { analyticsWorker } = await import('../../background/analytics-worker');
      await analyticsWorker.scheduleAggregation();
      await analyticsWorker.scheduleCleanup();
      debug.info('Background', '📊 Analytics worker initialized');
    } catch (error) {
      debug.error('Background', '❌ Analytics worker initialization failed', error as Error);
    }
    
    debug.info('Background', '✅ Extension setup completed', { reason: details.reason });
  } catch (error) {
    debug.error('Background', '❌ Extension setup failed', error as Error);
  }
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔧 Extension startup');
  debug.info('Background', '🚀 Extension started');
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
        debugMode: true
      }
    };

    let needsUpdate = false;
    const updates: any = {};

    Object.keys(defaults).forEach(key => {
      if (result[key] === undefined) {
        updates[key] = defaults[key as keyof typeof defaults];
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await chrome.storage.local.set(updates);
      debug.info('Background', '📝 Default settings initialized', updates);
    }

  } catch (error) {
    debug.error('Background', '❌ Failed to initialize extension data', error as Error);
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
    debug.info('Background', '✅ Context menus setup completed');
    
  } catch (error) {
    console.error('❌ Failed to setup context menus:', error);
    debug.error('Background', '❌ Context menu setup failed', error as Error);
  }
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('📱 Context menu clicked:', info.menuItemId, info);
  debug.trackUserAction('Background', 'context-menu-clicked', info.menuItemId as string, { 
    menuItemId: info.menuItemId,
    pageUrl: info.pageUrl 
  });
  
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
            debug.info('Background', '✅ Widget show message sent');
          } catch (error) {
            debug.warn('Background', '⚠️ Failed to send widget message', error as Error);
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
          debug.info('Background', '✅ QR generation message sent to content script');
        } catch (error) {
          debug.warn('Background', '⚠️ Failed to send message to content script', error as Error);
        }
      }
      
      console.log('✅ QR generation request stored');
      debug.info('Background', '✅ QR generation request processed', {
        text: textToGenerate.substring(0, 50),
        type: qrType
      });
    }
  } catch (error) {
    console.error('❌ Context menu action failed:', error);
    debug.error('Background', '❌ Context menu action failed', error as Error);
  }
});

// Message handling for communication between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type, sender);
  debug.info('Background', '📨 Message received', { type: message.type, sender: sender.tab?.url });

  switch (message.type) {
    case 'GENERATE_QR_CONTENT':
      handleContentQRGeneration(message, sendResponse);
      return true; // Keep channel open for async response

    case 'GET_CURRENT_TAB':
      handleGetCurrentTab(sendResponse);
      return true;

    case 'SHOW_NOTIFICATION':
      handleShowNotification(message);
      break;

    case 'TRACK_EVENT':
      debug.trackEvent('Background', message.eventName, message.eventData);
      break;

    default:
      debug.warn('Background', '⚠️ Unknown message type', { type: message.type });
  }
});

// Handle QR generation requests from content scripts
async function handleContentQRGeneration(message: any, sendResponse: (response: any) => void) {
  try {
    debug.info('Background', '🎯 Generating QR for content script', {
      text: message.text?.substring(0, 50),
      options: message.options
    });

    // Import QR service dynamically
    const { qrService } = await import('../../utils/qr-service');
    
    const qrData = await qrService.generateQRCode(
      message.text,
      message.options || {
        width: 200,
        color: {
          dark: '#9333ea',
          light: '#ffffff'
        }
      },
      'url'
    );

    sendResponse({
      success: true,
      dataUrl: qrData.dataUrl,
      qrData: qrData
    });

    debug.info('Background', '✅ QR generated for content script', { id: qrData.id });

  } catch (error) {
    console.error('❌ Content QR generation failed:', error);
    debug.error('Background', '❌ Content QR generation failed', error as Error);
    
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle current tab requests
async function handleGetCurrentTab(sendResponse: (response: any) => void) {
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

    debug.info('Background', '✅ Current tab info provided');
    
  } catch (error) {
    debug.error('Background', '❌ Failed to get current tab', error as Error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle notification requests
async function handleShowNotification(message: any) {
  try {
    if (chrome.notifications) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: message.title || 'QR Super Generator',
        message: message.message || 'Action completed'
      });
      
      debug.info('Background', '✅ Notification shown', { title: message.title });
    }
  } catch (error) {
    debug.error('Background', '❌ Failed to show notification', error as Error);
  }
}

// Tab updates - monitor for URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    debug.debug('Background', '📄 Tab updated', { tabId, url: tab.url });
    
    // Check if auto-generation is enabled - only trigger if explicitly enabled
    try {
      const result = await chrome.storage.local.get(['autoGenerate', 'showWidget']);
      // Require both settings to be explicitly set to true
      if (result.autoGenerate === true && result.showWidget === true && 
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
            debug.debug('Background', '⚠️ Content script not ready for auto-generation');
          }
        }, 1000);
      }
    } catch (error) {
      debug.warn('Background', '⚠️ Failed to check auto-generation settings', error as Error);
    }
  }
});

// Keep service worker alive with periodic activity
if (chrome.alarms) {
  chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
      debug.trace('Background', '💓 Keep alive ping');
    }
  });
}

debug.info('Background', '✅ Background script initialization completed');

