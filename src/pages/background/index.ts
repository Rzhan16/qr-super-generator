/**
 * QR Super Generator - Background Service
 * 
 * Handles Chrome extension background functionality including:
 * - Installation and updates
 * - Context menus
 * - Tab monitoring
 * - Analytics tracking
 */

const EXTENSION_ID = 'qr-super-generator';
const VERSION = '1.0.0';

console.log(`%c🚀 QR Super Generator Background Service v${VERSION}`, 
  'background: linear-gradient(45deg, #9333ea, #3b82f6); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

// Installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔧 Extension installed/updated:', details);
  
  if (details.reason === 'install') {
    console.log('✨ First-time installation detected');
    
    // Set up default settings
    chrome.storage.local.set({
      settings: {
        defaultSize: 256,
        defaultErrorCorrection: 'M',
        defaultColors: {
          dark: '#9333ea',
          light: '#ffffff'
        },
        autoGenerate: true,
        showNotifications: true,
        theme: 'dark',
        debugMode: false,
        maxHistorySize: 100
      },
      qrHistory: [],
      analytics: {
        totalGenerated: 0,
        typeDistribution: {},
        dailyUsage: {},
        averageGenerationTime: 0,
        mostUsedFeatures: [],
        errorCount: 0,
        lastUpdated: new Date().toISOString()
      }
    });
    
    console.log('✅ Default settings initialized');
  } else if (details.reason === 'update') {
    console.log(`🔄 Updated from version ${details.previousVersion} to ${VERSION}`);
  }
  
  // Create context menus
  setupContextMenus();
});

// Context menu setup
function setupContextMenus() {
  try {
    // Remove all existing context menus first
    chrome.contextMenus.removeAll(() => {
      console.log('🗑️ Cleared existing context menus');
      
      // Create main context menu
      chrome.contextMenus.create({
        id: 'qr-generator-main',
        title: 'Generate QR Code',
        contexts: ['page', 'selection', 'link']
      });
      
      // Create sub-menus for different types
      chrome.contextMenus.create({
        id: 'qr-generate-url',
        parentId: 'qr-generator-main',
        title: 'Current Page URL',
        contexts: ['page']
      });
      
      chrome.contextMenus.create({
        id: 'qr-generate-selection',
        parentId: 'qr-generator-main',
        title: 'Selected Text',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'qr-generate-link',
        parentId: 'qr-generator-main',
        title: 'Link URL',
        contexts: ['link']
      });
      
      console.log('✅ Context menus created');
    });
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
      
      console.log('✅ QR generation request stored');
    }
  } catch (error) {
    console.error('❌ Context menu action failed:', error);
  }
});

// Tab update monitoring for auto-generation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    console.log('🌐 Tab updated:', tab.url);
    
    try {
      // Get settings to check if auto-generation is enabled
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings;
      
      if (settings?.autoGenerate) {
        console.log('⚡ Auto-generation enabled for new tab');
        // This will be handled by the popup when it opens
      }
    } catch (error) {
      console.error('❌ Failed to check auto-generation settings:', error);
    }
  }
});

// Message passing between content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message, 'from:', sender);
  
  switch (message.type) {
    case 'get-tab-info':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        sendResponse({
          url: tab?.url,
          title: tab?.title,
          favIconUrl: tab?.favIconUrl
        });
      });
      return true; // Keep channel open for async response
      
    case 'analytics-update':
      updateAnalytics(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'debug-log':
      if (message.level === 'error') {
        console.error('🔴 Popup Error:', message.message, message.data);
      } else {
        console.log('🔵 Popup Debug:', message.message, message.data);
      }
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
  }
});

// Analytics helper function
async function updateAnalytics(analyticsData: any) {
  try {
    const result = await chrome.storage.local.get(['analytics']);
    const currentAnalytics = result.analytics || {
      totalGenerated: 0,
      typeDistribution: {},
      dailyUsage: {},
      averageGenerationTime: 0,
      mostUsedFeatures: [],
      errorCount: 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Merge analytics data
    const updatedAnalytics = {
      ...currentAnalytics,
      ...analyticsData,
      lastUpdated: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ analytics: updatedAnalytics });
    console.log('📊 Analytics updated:', updatedAnalytics);
  } catch (error) {
    console.error('❌ Failed to update analytics:', error);
  }
}

// Periodic cleanup and maintenance
setInterval(async () => {
  try {
    console.log('🧹 Running periodic maintenance...');
    
    // Clean up old pending QR generations (older than 1 minute)
    const result = await chrome.storage.local.get(['pendingQRGeneration']);
    if (result.pendingQRGeneration) {
      const age = Date.now() - result.pendingQRGeneration.timestamp;
      if (age > 60000) { // 1 minute
        await chrome.storage.local.remove(['pendingQRGeneration']);
        console.log('🗑️ Cleaned up old pending QR generation');
      }
    }
    
    // Update daily usage tracking
    const today = new Date().toISOString().split('T')[0];
    const analyticsResult = await chrome.storage.local.get(['analytics']);
    if (analyticsResult.analytics) {
      const analytics = analyticsResult.analytics;
      if (!analytics.dailyUsage[today]) {
        analytics.dailyUsage[today] = 0;
        await chrome.storage.local.set({ analytics });
        console.log('📅 Initialized daily usage tracking for', today);
      }
    }
    
  } catch (error) {
    console.error('❌ Maintenance task failed:', error);
  }
}, 60000); // Run every minute

// Error handling
self.addEventListener('error', (event) => {
  console.error('💥 Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});

console.log('✅ Background service initialization complete');
