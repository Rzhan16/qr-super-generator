/**
 * QR Super Generator - Storage Service
 * 
 * Comprehensive Chrome storage management with debugging,
 * validation, and testing capabilities
 */

import { debug } from './debug';
import {
  QRCodeData,
  ExtensionSettings,
  AnalyticsData,
  StorageData,
  TypeValidator,
  DEFAULT_SETTINGS
} from '../types';

export class StorageService {
  private static instance: StorageService;
  private cache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

  private constructor() {
    debug.info('StorageService', '💾 Storage Service initialized');
    this.initializeStorage();
    this.setupStorageListener();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize storage with default values
   */
  private async initializeStorage(): Promise<void> {
    const component = 'StorageService.Init';
    
    try {
      debug.info(component, '🔧 Initializing storage with defaults');

      const existingData = await this.getAllStorageData();
      debug.debug(component, '📊 Existing storage data', {
        keys: Object.keys(existingData),
        dataSize: JSON.stringify(existingData).length
      });

      // Initialize missing data with defaults
      const updates: Partial<StorageData> = {};
      
      if (!existingData.settings) {
        updates.settings = DEFAULT_SETTINGS;
        debug.info(component, '⚙️ Initializing default settings');
      }

      if (!existingData.qrHistory) {
        updates.qrHistory = [];
        debug.info(component, '📜 Initializing empty QR history');
      }

      if (!existingData.analytics) {
        updates.analytics = {
          totalGenerated: 0,
          typeDistribution: {},
          dailyUsage: {},
          averageGenerationTime: 0,
          mostUsedFeatures: [],
          errorCount: 0,
          lastUpdated: new Date().toISOString()
        };
        debug.info(component, '📈 Initializing default analytics');
      }

      if (Object.keys(updates).length > 0) {
        await this.setStorageData(updates);
        debug.info(component, '✅ Storage initialized with defaults', Object.keys(updates));
      } else {
        debug.info(component, '✅ Storage already initialized');
      }

      // Run storage validation
      await this.validateStorageIntegrity();

    } catch (error) {
      debug.error(component, '❌ Storage initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * Set up storage change listener
   */
  private setupStorageListener(): void {
    const component = 'StorageService.Listener';
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          debug.debug(component, '🔄 Storage changed', {
            keys: Object.keys(changes),
            area: areaName
          });

          // Invalidate cache for changed keys
          Object.keys(changes).forEach(key => {
            this.cache.delete(key);
            this.cacheTimestamps.delete(key);
            debug.trace(component, `🗑️ Cache invalidated for key: ${key}`);
          });
        }
      });
      debug.debug(component, '👂 Storage listener set up');
    }
  }

  /**
   * Get data from storage with caching
   */
  private async getStorageData<T>(key: string): Promise<T | undefined> {
    const component = 'StorageService.Get';
    debug.trace(component, `📖 Getting storage data for key: ${key}`);

    // Check cache first
    const cached = this.cache.get(key);
    const cacheTime = this.cacheTimestamps.get(key);
    
    if (cached && cacheTime && (Date.now() - cacheTime) < this.CACHE_TTL) {
      debug.trace(component, `🎯 Cache hit for key: ${key}`);
      return cached;
    }

    try {
      debug.startPerformance(`storage-get-${key}`, component);

      const result = await new Promise<T | undefined>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
                // Fallback to localStorage for development (if available)
      const data = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
          resolve(data ? JSON.parse(data) : undefined);
          return;
        }

        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result[key]);
        });
      });

      debug.endPerformance(`storage-get-${key}`, component);

      // Update cache
      if (result !== undefined) {
        this.cache.set(key, result);
        this.cacheTimestamps.set(key, Date.now());
        debug.trace(component, `💾 Cached data for key: ${key}`);
      }

      debug.debug(component, `✅ Retrieved data for key: ${key}`, {
        hasData: result !== undefined,
        dataType: typeof result
      });

      return result;

    } catch (error) {
      debug.endPerformance(`storage-get-${key}`, component);
      debug.error(component, `❌ Failed to get data for key: ${key}`, error as Error);
      throw error;
    }
  }

  /**
   * Set data in storage
   */
  private async setStorageData(data: Record<string, any>): Promise<void> {
    const component = 'StorageService.Set';
    debug.debug(component, '💾 Setting storage data', {
      keys: Object.keys(data),
      dataSize: JSON.stringify(data).length
    });

    try {
      debug.startPerformance('storage-set', component);

      await new Promise<void>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
          // Fallback to localStorage for development (if available)
          if (typeof localStorage !== 'undefined') {
            Object.entries(data).forEach(([key, value]) => {
              localStorage.setItem(key, JSON.stringify(value));
            });
          }
          resolve();
          return;
        }

        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });

      debug.endPerformance('storage-set', component);

      // Update cache
      Object.entries(data).forEach(([key, value]) => {
        this.cache.set(key, value);
        this.cacheTimestamps.set(key, Date.now());
      });

      debug.info(component, '✅ Storage data set successfully', Object.keys(data));

    } catch (error) {
      debug.endPerformance('storage-set', component);
      debug.error(component, '❌ Failed to set storage data', error as Error, data);
      throw error;
    }
  }

  /**
   * Get all storage data
   */
  private async getAllStorageData(): Promise<StorageData> {
    const component = 'StorageService.GetAll';
    debug.trace(component, '📚 Getting all storage data');

    try {
      const result = await new Promise<StorageData>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
          // Fallback to localStorage for development (if available)
          const data: StorageData = {
            qrHistory: typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('qrHistory') || '[]') : [],
            settings: typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('settings') || 'null') || DEFAULT_SETTINGS) : DEFAULT_SETTINGS,
            analytics: typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('analytics') || 'null') || {
              totalGenerated: 0,
              typeDistribution: {},
              dailyUsage: {},
              averageGenerationTime: 0,
              mostUsedFeatures: [],
              errorCount: 0,
              lastUpdated: new Date().toISOString()
            }) : {
              totalGenerated: 0,
              typeDistribution: {},
              dailyUsage: {},
              averageGenerationTime: 0,
              mostUsedFeatures: [],
              errorCount: 0,
              lastUpdated: new Date().toISOString()
            }
          };
          resolve(data);
          return;
        }

        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(result as StorageData);
        });
      });

      debug.debug(component, '✅ All storage data retrieved', {
        keys: Object.keys(result),
        historyLength: result.qrHistory?.length || 0
      });

      return result;

    } catch (error) {
      debug.error(component, '❌ Failed to get all storage data', error as Error);
      throw error;
    }
  }

  /**
   * Add QR code to history
   */
  public async addToHistory(qrData: QRCodeData): Promise<void> {
    const component = 'StorageService.AddHistory';
    debug.info(component, '📝 Adding QR to history', {
      id: qrData.id,
      type: qrData.type,
      title: qrData.title
    });

    try {
      // Validate QR data
      if (!TypeValidator.isQRCodeData(qrData)) {
        const error = new Error('Invalid QR data provided');
        debug.error(component, '❌ QR data validation failed', error, qrData);
        throw error;
      }

      const currentHistory = await this.getQRHistory();
      
      // Remove duplicates based on text and recent timestamp
      const oneMinuteAgo = Date.now() - 60000;
      const filteredHistory = currentHistory.filter(item => 
        item.text !== qrData.text || 
        new Date(item.timestamp).getTime() < oneMinuteAgo
      );

      // Add new QR to beginning
      const newHistory = [qrData, ...filteredHistory];
      
      // Get max history size from settings
      const settings = await this.getSettings();
      const maxSize = settings.maxHistorySize || 100;
      
      // Trim to max size
      const trimmedHistory = newHistory.slice(0, maxSize);

      await this.setStorageData({ qrHistory: trimmedHistory });

      debug.info(component, '✅ QR added to history', {
        newHistoryLength: trimmedHistory.length,
        maxSize,
        removed: newHistory.length - trimmedHistory.length
      });

      // Update analytics
      await this.updateAnalytics({
        totalGenerated: (await this.getAnalytics()).totalGenerated + 1,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      debug.error(component, '❌ Failed to add QR to history', error as Error, qrData);
      throw error;
    }
  }

  /**
   * Get QR history
   */
  public async getQRHistory(): Promise<QRCodeData[]> {
    const component = 'StorageService.GetHistory';
    debug.trace(component, '📜 Getting QR history');

    try {
      const history = await this.getStorageData<QRCodeData[]>('qrHistory') || [];
      
      // Validate and filter corrupted entries
      const validHistory = history.filter(qr => {
        if (!TypeValidator.isQRCodeData(qr)) {
          debug.warn(component, '⚠️ Removing invalid QR from history', qr);
          return false;
        }
        return true;
      });

      // If we filtered out invalid entries, save the cleaned history
      if (validHistory.length !== history.length) {
        debug.info(component, '🧹 Cleaned invalid entries from history', {
          original: history.length,
          cleaned: validHistory.length,
          removed: history.length - validHistory.length
        });
        await this.setStorageData({ qrHistory: validHistory });
      }

      debug.debug(component, '✅ QR history retrieved', {
        count: validHistory.length
      });

      return validHistory;

    } catch (error) {
      debug.error(component, '❌ Failed to get QR history', error as Error);
      return [];
    }
  }

  /**
   * Clear QR history
   */
  public async clearHistory(): Promise<void> {
    const component = 'StorageService.ClearHistory';
    debug.info(component, '🗑️ Clearing QR history');

    try {
      await this.setStorageData({ qrHistory: [] });
      debug.info(component, '✅ QR history cleared');
    } catch (error) {
      debug.error(component, '❌ Failed to clear QR history', error as Error);
      throw error;
    }
  }

  /**
   * Remove specific QR from history
   */
  public async removeFromHistory(qrId: string): Promise<void> {
    const component = 'StorageService.RemoveHistory';
    debug.info(component, `🗑️ Removing QR from history: ${qrId}`);

    try {
      const currentHistory = await this.getQRHistory();
      const filteredHistory = currentHistory.filter(qr => qr.id !== qrId);
      
      await this.setStorageData({ qrHistory: filteredHistory });
      
      debug.info(component, '✅ QR removed from history', {
        id: qrId,
        newLength: filteredHistory.length
      });

    } catch (error) {
      debug.error(component, '❌ Failed to remove QR from history', error as Error, { qrId });
      throw error;
    }
  }

  /**
   * Get settings
   */
  public async getSettings(): Promise<ExtensionSettings> {
    const component = 'StorageService.GetSettings';
    debug.trace(component, '⚙️ Getting settings');

    try {
      const settings = await this.getStorageData<ExtensionSettings>('settings');
      
      if (!settings) {
        debug.info(component, '🔧 No settings found, using defaults');
        await this.setStorageData({ settings: DEFAULT_SETTINGS });
        return DEFAULT_SETTINGS;
      }

      // Merge with defaults to add any new settings
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
      
      debug.debug(component, '✅ Settings retrieved', {
        hasCustomSettings: true,
        theme: mergedSettings.theme,
        debugMode: mergedSettings.debugMode
      });

      return mergedSettings;

    } catch (error) {
      debug.error(component, '❌ Failed to get settings', error as Error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update settings
   */
  public async updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
    const component = 'StorageService.UpdateSettings';
    debug.info(component, '⚙️ Updating settings', updates);

    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...updates };
      
      await this.setStorageData({ settings: newSettings });
      
      debug.info(component, '✅ Settings updated', Object.keys(updates));

    } catch (error) {
      debug.error(component, '❌ Failed to update settings', error as Error, updates);
      throw error;
    }
  }

  /**
   * Get analytics
   */
  public async getAnalytics(): Promise<AnalyticsData> {
    const component = 'StorageService.GetAnalytics';
    debug.trace(component, '📈 Getting analytics');

    try {
      const analytics = await this.getStorageData<AnalyticsData>('analytics');
      
      if (!analytics) {
        const defaultAnalytics: AnalyticsData = {
          totalGenerated: 0,
          typeDistribution: {},
          dailyUsage: {},
          averageGenerationTime: 0,
          mostUsedFeatures: [],
          errorCount: 0,
          lastUpdated: new Date().toISOString()
        };
        
        await this.setStorageData({ analytics: defaultAnalytics });
        return defaultAnalytics;
      }

      debug.debug(component, '✅ Analytics retrieved', {
        totalGenerated: analytics.totalGenerated,
        lastUpdated: analytics.lastUpdated
      });

      return analytics;

    } catch (error) {
      debug.error(component, '❌ Failed to get analytics', error as Error);
      return {
        totalGenerated: 0,
        typeDistribution: {},
        dailyUsage: {},
        averageGenerationTime: 0,
        mostUsedFeatures: [],
        errorCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Update analytics
   */
  public async updateAnalytics(updates: Partial<AnalyticsData>): Promise<void> {
    const component = 'StorageService.UpdateAnalytics';
    debug.debug(component, '📊 Updating analytics', updates);

    try {
      const currentAnalytics = await this.getAnalytics();
      const newAnalytics = { ...currentAnalytics, ...updates };
      
      await this.setStorageData({ analytics: newAnalytics });
      
      debug.debug(component, '✅ Analytics updated');

    } catch (error) {
      debug.error(component, '❌ Failed to update analytics', error as Error, updates);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  public async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    const component = 'StorageService.Usage';
    debug.trace(component, '📏 Getting storage usage');

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const bytesInUse = await new Promise<number>((resolve, reject) => {
          chrome.storage.local.getBytesInUse(null, (bytes) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(bytes);
          });
        });

        const quota = 5 * 1024 * 1024; // 5MB Chrome local storage quota
        const percentage = (bytesInUse / quota) * 100;

        debug.debug(component, '✅ Storage usage calculated', {
          used: bytesInUse,
          quota,
          percentage: percentage.toFixed(2) + '%'
        });

        return { used: bytesInUse, quota, percentage };
      }

      // Fallback for development
      const allData = await this.getAllStorageData();
      const dataSize = JSON.stringify(allData).length;
      const quota = 5 * 1024 * 1024;
      const percentage = (dataSize / quota) * 100;

      return { used: dataSize, quota, percentage };

    } catch (error) {
      debug.error(component, '❌ Failed to get storage usage', error as Error);
      return { used: 0, quota: 5 * 1024 * 1024, percentage: 0 };
    }
  }

  /**
   * Validate storage integrity
   */
  private async validateStorageIntegrity(): Promise<void> {
    const component = 'StorageService.Validate';
    debug.info(component, '🔍 Validating storage integrity');

    try {
      const allData = await this.getAllStorageData();
      const issues: string[] = [];

      // Validate QR history
      if (allData.qrHistory) {
        const invalidQRs = allData.qrHistory.filter(qr => !TypeValidator.isQRCodeData(qr));
        if (invalidQRs.length > 0) {
          issues.push(`${invalidQRs.length} invalid QR codes in history`);
        }
      }

      // Validate settings
      if (allData.settings) {
        const requiredSettingsKeys = Object.keys(DEFAULT_SETTINGS);
        const missingKeys = requiredSettingsKeys.filter(key => !(key in allData.settings));
        if (missingKeys.length > 0) {
          issues.push(`Missing settings keys: ${missingKeys.join(', ')}`);
        }
      }

      if (issues.length > 0) {
        debug.warn(component, '⚠️ Storage integrity issues found', issues);
      } else {
        debug.info(component, '✅ Storage integrity validated successfully');
      }

    } catch (error) {
      debug.error(component, '❌ Storage integrity validation failed', error as Error);
    }
  }

  /**
   * Export all data for backup
   */
  public async exportData(): Promise<string> {
    const component = 'StorageService.Export';
    debug.info(component, '📤 Exporting all data');

    try {
      const allData = await this.getAllStorageData();
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: allData
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      
      debug.info(component, '✅ Data exported successfully', {
        size: jsonString.length,
        qrCount: allData.qrHistory?.length || 0
      });

      return jsonString;

    } catch (error) {
      debug.error(component, '❌ Failed to export data', error as Error);
      throw error;
    }
  }

  /**
   * Import data from backup
   */
  public async importData(jsonData: string): Promise<void> {
    const component = 'StorageService.Import';
    debug.info(component, '📥 Importing data');

    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.data) {
        throw new Error('Invalid import format');
      }

      await this.setStorageData(importData.data);
      
      // Clear cache to force refresh
      this.cache.clear();
      this.cacheTimestamps.clear();
      
      debug.info(component, '✅ Data imported successfully', {
        version: importData.version,
        timestamp: importData.timestamp
      });

    } catch (error) {
      debug.error(component, '❌ Failed to import data', error as Error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  public async clearAllData(): Promise<void> {
    const component = 'StorageService.ClearAll';
    debug.warn(component, '🗑️ Clearing ALL data');

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve();
          });
        });
      } else {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      }

      this.cache.clear();
      this.cacheTimestamps.clear();
      
      debug.warn(component, '🗑️ ALL data cleared');

    } catch (error) {
      debug.error(component, '❌ Failed to clear all data', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();

// Export for testing and debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.storageService = storageService;
  // @ts-ignore
  window.exportStorageData = () => storageService.exportData();
  // @ts-ignore
  window.clearStorageData = () => storageService.clearAllData();
}

export default storageService;