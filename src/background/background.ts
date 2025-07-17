/**
 * Background Service Worker for QR Super Generator
 * Handles extension lifecycle, commands, and message passing
 */

import { generateQRCode } from '../utils/qr-generator';
import { getCurrentTab, saveToStorage, getFromStorage } from '../utils/chrome-apis';

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log('QR Super Generator installed:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    handleExtensionUpdate(details.previousVersion);
  }
});

// Initialize extension on first install
async function initializeExtension() {
  try {
    // Set default settings
    const defaultSettings = {
      qrOptions: {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      },
      analytics: {
        enabled: true,
        qrCodesGenerated: 0,
        installDate: new Date().toISOString()
      },
      preferences: {
        autoDownload: false,
        showNotifications: true,
        defaultFilename: 'qr-code'
      }
    };

    await saveToStorage(defaultSettings);
    console.log('Extension initialized with default settings');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Handle extension updates
async function handleExtensionUpdate(previousVersion?: string) {
  try {
    console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Perform any necessary data migrations here
    const settings = await getFromStorage();
    
    // Example: Add new settings for new version
    if (!settings.preferences) {
      settings.preferences = {
        autoDownload: false,
        showNotifications: true,
        defaultFilename: 'qr-code'
      };
      await saveToStorage(settings);
    }
  } catch (error) {
    console.error('Failed to handle extension update:', error);
  }
}

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  
  if (command === 'generate-qr') {
    try {
      const tab = await getCurrentTab();
      if (tab.url) {
        await handleQuickQRGeneration(tab.url, tab.title);
      }
    } catch (error) {
      console.error('Failed to handle quick QR generation:', error);
    }
  }
});

// Quick QR generation from keyboard shortcut
async function handleQuickQRGeneration(url: string, title?: string) {
  try {
    const settings = await getFromStorage(['qrOptions', 'preferences', 'analytics']);
    const qrDataUrl = await generateQRCode(url, settings.qrOptions);
    
    // Save to history
    const history = await getFromStorage(['qrHistory']);
    const qrHistory = history.qrHistory || [];
    
    const newEntry = {
      id: Date.now(),
      text: url,
      dataUrl: qrDataUrl,
      timestamp: new Date().toISOString(),
      title: title || 'Quick QR Code',
      fromShortcut: true
    };
    
    const updatedHistory = [newEntry, ...qrHistory.slice(0, 9)];
    
    // Update analytics
    const analytics = settings.analytics || {};
    analytics.qrCodesGenerated = (analytics.qrCodesGenerated || 0) + 1;
    analytics.lastGenerated = new Date().toISOString();
    
    await saveToStorage({
      qrHistory: updatedHistory,
      analytics: analytics
    });
    
    // Show notification if enabled
    if (settings.preferences?.showNotifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'QR Code Generated',
        message: `QR code created for: ${title || url}`,
        buttons: [
          { title: 'Download' },
          { title: 'Copy' }
        ]
      });
    }
    
    console.log('Quick QR generation completed');
  } catch (error) {
    console.error('Quick QR generation failed:', error);
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'QR Generation Failed',
      message: 'Failed to generate QR code. Please try again.'
    });
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  try {
    const history = await getFromStorage(['qrHistory']);
    const qrHistory = history.qrHistory || [];
    
    if (qrHistory.length > 0) {
      const latestQR = qrHistory[0];
      
      if (buttonIndex === 0) {
        // Download button clicked
        const filename = `qr-code-${Date.now()}.png`;
        chrome.downloads.download({
          url: latestQR.dataUrl,
          filename: filename
        });
      } else if (buttonIndex === 1) {
        // Copy button clicked - copy URL to clipboard
        // Note: Direct clipboard access from background script is limited
        // We'll send a message to the active tab to handle this
        const tab = await getCurrentTab();
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'copyToClipboard',
            text: latestQR.text
          });
        }
      }
    }
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
  } catch (error) {
    console.error('Failed to handle notification button click:', error);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  switch (message.action) {
    case 'generateQR':
      handleQRGenerationRequest(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'getBatchTabs':
      getBatchTabsData()
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'updateAnalytics':
      updateAnalytics(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// Handle QR generation requests
async function handleQRGenerationRequest(data: any) {
  try {
    const settings = await getFromStorage(['qrOptions']);
    const qrDataUrl = await generateQRCode(data.text, settings.qrOptions);
    
    // Update analytics
    await updateAnalytics({ qrGenerated: true });
    
    return { dataUrl: qrDataUrl };
  } catch (error) {
    console.error('QR generation request failed:', error);
    throw error;
  }
}

// Get batch tabs data
async function getBatchTabsData() {
  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });
    
    return tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://'));
  } catch (error) {
    console.error('Failed to get batch tabs data:', error);
    throw error;
  }
}

// Update analytics
async function updateAnalytics(data: any) {
  try {
    const current = await getFromStorage(['analytics']);
    const analytics = current.analytics || {};
    
    if (data.qrGenerated) {
      analytics.qrCodesGenerated = (analytics.qrCodesGenerated || 0) + 1;
      analytics.lastGenerated = new Date().toISOString();
    }
    
    if (data.extensionOpened) {
      analytics.timesOpened = (analytics.timesOpened || 0) + 1;
      analytics.lastOpened = new Date().toISOString();
    }
    
    await saveToStorage({ analytics });
  } catch (error) {
    console.error('Failed to update analytics:', error);
    throw error;
  }
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('QR Super Generator started');
});

// Handle tab updates for potential auto-generation features
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Could implement auto-generation features here if needed
    console.log('Tab updated:', tab.url);
  }
});

// Clean up old data periodically
setInterval(async () => {
  try {
    const data = await getFromStorage(['qrHistory']);
    const qrHistory = data.qrHistory || [];
    
    // Keep only last 50 entries
    if (qrHistory.length > 50) {
      const trimmedHistory = qrHistory.slice(0, 50);
      await saveToStorage({ qrHistory: trimmedHistory });
      console.log('Cleaned up old QR history entries');
    }
  } catch (error) {
    console.error('Failed to clean up old data:', error);
  }
}, 60 * 60 * 1000); // Run every hour

console.log('QR Super Generator background script loaded'); 