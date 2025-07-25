/**
 * Chrome Storage Management for QR Super Generator
 * Provides type-safe storage operations with caching and validation
 */

import type {
  ExtensionSettings,
  QRCodeData,
  UserPreferences,
  AnalyticsData,
  QRGenerationOptions
} from '../types';

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'qr_settings',
  HISTORY: 'qr_history',
  ANALYTICS: 'qr_analytics',
  PREFERENCES: 'user_preferences',
  RECENT_COLORS: 'recent_colors',
  TEMPLATES: 'qr_templates'
} as const;

// Default settings
const DEFAULT_SETTINGS: ExtensionSettings = {
  qrOptions: {
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png'
  },
  preferences: {
    autoDownload: false,
    showNotifications: true,
    defaultFilename: 'qr-code',
    theme: 'light',
    defaultQRType: 'url',
    batchLimit: 50,
    compressionLevel: 'medium',
    copyBehavior: 'image'
  },
  analytics: {
    enabled: true,
    installDate: new Date().toISOString(),
    qrCodesGenerated: 0,
    timesOpened: 0,
    featuresUsed: {},
    averageQRSize: 256,
    mostUsedErrorLevel: 'M',
    totalDownloads: 0
  }
};

// In-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * Generic storage getter with caching
 */
async function getStorageData<T>(key: string, defaultValue?: T, cacheTTL = 5000): Promise<T> {
  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const data = result[key] !== undefined ? result[key] : defaultValue;
      
      // Cache the result
      if (data !== undefined) {
        cache.set(key, { data, timestamp: Date.now(), ttl: cacheTTL });
      }
      
      resolve(data);
    });
  });
}

/**
 * Generic storage setter with cache invalidation
 */
async function setStorageData<T>(key: string, data: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: data }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      // Update cache
      cache.set(key, { data, timestamp: Date.now(), ttl: 5000 });
      resolve();
    });
  });
}

/**
 * Get QR generation options
 */
export async function getQROptions(): Promise<QRGenerationOptions> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return settings.qrOptions;
}

/**
 * Update QR generation options
 */
export async function setQROptions(options: Partial<QRGenerationOptions>): Promise<void> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  settings.qrOptions = { ...settings.qrOptions, ...options };
  await setStorageData(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return settings.preferences;
}

/**
 * Update user preferences
 */
export async function setUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  settings.preferences = { ...settings.preferences, ...preferences };
  await setStorageData(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Get QR code history
 */
export async function getQRHistory(limit = 50): Promise<QRCodeData[]> {
  const history = await getStorageData<QRCodeData[]>(STORAGE_KEYS.HISTORY, []);
  return history.slice(0, limit);
}

/**
 * Add QR code to history
 */
export async function addToQRHistory(qrData: QRCodeData): Promise<void> {
  try {
    // Validate QR data before saving
    if (!qrData || !qrData.dataUrl || !qrData.text || !qrData.timestamp) {
      throw new Error('Invalid QR data provided');
    }

    // Ensure dataUrl is a valid data URL
    if (!qrData.dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid QR code data URL');
    }

    const history = await getStorageData<QRCodeData[]>(STORAGE_KEYS.HISTORY, []);
    
    // Remove duplicates based on text content and timestamp proximity (within 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    const filteredHistory = history.filter(item => 
      item.text !== qrData.text || 
      new Date(item.timestamp).getTime() < oneMinuteAgo
    );
    
    // Ensure QR data has required fields with defaults
    const validatedQrData: QRCodeData = {
      ...qrData,
      id: qrData.id || Date.now(),
      title: qrData.title || 'Untitled QR Code',
      type: qrData.type || 'text',
      metadata: {
        size: 256,
        errorLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        ...qrData.metadata
      }
    };
    
    // Add new item to beginning
    const newHistory = [validatedQrData, ...filteredHistory].slice(0, 100); // Keep max 100 items
    
    await setStorageData(STORAGE_KEYS.HISTORY, newHistory);
  } catch (error) {
    console.error('Failed to save QR to history:', error);
    throw error;
  }
}

/**
 * Clear QR code history
 */
export async function clearQRHistory(): Promise<void> {
  await setStorageData(STORAGE_KEYS.HISTORY, []);
}

/**
 * Remove specific QR from history
 */
export async function removeFromQRHistory(id: number): Promise<void> {
  const history = await getStorageData<QRCodeData[]>(STORAGE_KEYS.HISTORY, []);
  const filtered = history.filter(item => item.id !== id);
  await setStorageData(STORAGE_KEYS.HISTORY, filtered);
}

/**
 * Get analytics data
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return settings.analytics;
}

/**
 * Update analytics data
 */
export async function updateAnalytics(updates: Partial<AnalyticsData>): Promise<void> {
  const settings = await getStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  settings.analytics = { ...settings.analytics, ...updates };
  await setStorageData(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Track QR generation event
 */
export async function trackQRGeneration(type: string, size: number): Promise<void> {
  const analytics = await getAnalytics();
  
  const updates: Partial<AnalyticsData> = {
    qrCodesGenerated: analytics.qrCodesGenerated + 1,
    lastGenerated: new Date().toISOString(),
    averageQRSize: Math.round((analytics.averageQRSize + size) / 2),
    featuresUsed: {
      ...analytics.featuresUsed,
      [type]: ((analytics.featuresUsed as any)[type] || 0) + 1
    }
  };

  await updateAnalytics(updates);
}

/**
 * Track download event
 */
export async function trackDownload(): Promise<void> {
  const analytics = await getAnalytics();
  await updateAnalytics({
    totalDownloads: analytics.totalDownloads + 1
  });
}

/**
 * Get recent colors used
 */
export async function getRecentColors(): Promise<string[]> {
  return await getStorageData<string[]>(STORAGE_KEYS.RECENT_COLORS, []);
}

/**
 * Add color to recent colors
 */
export async function addRecentColor(color: string): Promise<void> {
  const recent = await getRecentColors();
  const filtered = recent.filter(c => c !== color);
  const newRecent = [color, ...filtered].slice(0, 10); // Keep last 10 colors
  await setStorageData(STORAGE_KEYS.RECENT_COLORS, newRecent);
}

/**
 * Get QR templates
 */
export async function getQRTemplates(): Promise<any[]> {
  return await getStorageData<any[]>(STORAGE_KEYS.TEMPLATES, []);
}

/**
 * Save QR template
 */
export async function saveQRTemplate(template: any): Promise<void> {
  const templates = await getQRTemplates();
  const newTemplates = [template, ...templates].slice(0, 20); // Keep max 20 templates
  await setStorageData(STORAGE_KEYS.TEMPLATES, newTemplates);
}

/**
 * Delete QR template
 */
export async function deleteQRTemplate(id: string): Promise<void> {
  const templates = await getQRTemplates();
  const filtered = templates.filter(t => t.id !== id);
  await setStorageData(STORAGE_KEYS.TEMPLATES, filtered);
}

/**
 * Initialize storage with default values
 */
export async function initializeStorage(): Promise<void> {
  try {
    const existingSettings = await getStorageData(STORAGE_KEYS.SETTINGS);
    
    if (!existingSettings) {
      await setStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    } else {
      // Merge with defaults to add any new settings
      const settings = existingSettings as ExtensionSettings;
      const mergedSettings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        ...settings,
        qrOptions: { ...DEFAULT_SETTINGS.qrOptions, ...settings.qrOptions },
        preferences: { ...DEFAULT_SETTINGS.preferences, ...settings.preferences },
        analytics: { ...DEFAULT_SETTINGS.analytics, ...settings.analytics }
      };
      await setStorageData(STORAGE_KEYS.SETTINGS, mergedSettings);
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw error;
  }
}

/**
 * Export all storage data (for backup)
 */
export async function exportStorageData(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest()?.version || '1.0.0',
        data: result
      };
      
      resolve(JSON.stringify(exportData, null, 2));
    });
  });
}

/**
 * Import storage data (from backup)
 */
export async function importStorageData(jsonData: string): Promise<void> {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.data) {
      throw new Error('Invalid backup format');
    }
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(importData.data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // Clear cache to force refresh
        cache.clear();
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to import storage data:', error);
    throw new Error('Failed to import data: Invalid format');
  }
}

/**
 * Clear all storage data
 */
export async function clearAllStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      cache.clear();
      resolve();
    });
  });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{ used: number; quota: number }> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      // Chrome local storage quota is typically 5MB
      resolve({
        used: bytesInUse,
        quota: 5 * 1024 * 1024 // 5MB in bytes
      });
    });
  });
}

// Storage event listener for cross-tab synchronization
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      // Invalidate cache for changed keys
      Object.keys(changes).forEach(key => {
        cache.delete(key);
      });
    }
  });
}

export default {
  getQROptions,
  setQROptions,
  getUserPreferences,
  setUserPreferences,
  getQRHistory,
  addToQRHistory,
  clearQRHistory,
  removeFromQRHistory,
  getAnalytics,
  updateAnalytics,
  trackQRGeneration,
  trackDownload,
  getRecentColors,
  addRecentColor,
  getQRTemplates,
  saveQRTemplate,
  deleteQRTemplate,
  initializeStorage,
  exportStorageData,
  importStorageData,
  clearAllStorage,
  getStorageStats
};