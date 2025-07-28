/**
 * QR Super Generator - Chrome APIs Wrapper
 * 
 * Comprehensive wrapper for Chrome extension APIs with error handling,
 * TypeScript support, and debugging capabilities
 */

import { debug } from './debug';

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
  windowId?: number;
}

export interface StorageData {
  [key: string]: any;
}

export class ChromeAPIs {
  private static instance: ChromeAPIs;
  private component = 'ChromeAPIs';

  private constructor() {
    debug.info(this.component, '🔧 Chrome APIs wrapper initialized');
  }

  public static getInstance(): ChromeAPIs {
    if (!ChromeAPIs.instance) {
      ChromeAPIs.instance = new ChromeAPIs();
    }
    return ChromeAPIs.instance;
  }

  // Tab Management
  async getCurrentTab(): Promise<TabInfo | null> {
    try {
      debug.debug(this.component, '🌐 Getting current tab');
      
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        debug.warn(this.component, '⚠️ Chrome tabs API not available');
        return null;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab) {
        debug.info(this.component, '✅ Current tab retrieved', {
          url: currentTab.url,
          title: currentTab.title
        });
        return {
          id: currentTab.id,
          url: currentTab.url,
          title: currentTab.title,
          favIconUrl: currentTab.favIconUrl,
          active: currentTab.active,
          windowId: currentTab.windowId
        };
      }
      
      debug.warn(this.component, '⚠️ No active tab found');
      return null;
    } catch (error) {
      debug.error(this.component, '❌ Failed to get current tab', error as Error);
      return null;
    }
  }

  async getAllTabs(): Promise<TabInfo[]> {
    try {
      debug.debug(this.component, '📑 Getting all tabs via background script');
      
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        debug.warn(this.component, '⚠️ Chrome runtime API not available');
        return [];
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_ALL_TABS' }, (response) => {
          if (chrome.runtime.lastError) {
            debug.error(this.component, '❌ Failed to get all tabs', new Error(chrome.runtime.lastError.message));
            resolve([]);
            return;
          }
          
          if (response && response.success) {
            debug.info(this.component, `✅ Retrieved ${response.tabs.length} tabs`);
            resolve(response.tabs);
          } else {
            debug.warn(this.component, '⚠️ Failed to get tabs from background', response?.error);
            resolve([]);
          }
        });
      });
    } catch (error) {
      debug.error(this.component, '❌ Failed to get all tabs', error as Error);
      return [];
    }
  }

  async getOpenHttpTabs(): Promise<TabInfo[]> {
    try {
      debug.debug(this.component, '🌐 Getting HTTP tabs via background script');
      
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        debug.warn(this.component, '⚠️ Chrome runtime API not available');
        return [];
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_HTTP_TABS' }, (response) => {
          if (chrome.runtime.lastError) {
            debug.error(this.component, '❌ Failed to get HTTP tabs', new Error(chrome.runtime.lastError.message));
            resolve([]);
            return;
          }
          
          if (response && response.success) {
            debug.info(this.component, `✅ Found ${response.tabs.length} HTTP/HTTPS tabs`);
            resolve(response.tabs);
          } else {
            debug.warn(this.component, '⚠️ Failed to get HTTP tabs from background', response?.error);
            resolve([]);
          }
        });
      });
    } catch (error) {
      debug.error(this.component, '❌ Failed to get HTTP tabs', error as Error);
      return [];
    }
  }

  // Storage Management
  async setStorage(data: StorageData): Promise<boolean> {
    try {
      debug.debug(this.component, '💾 Setting storage data', { keys: Object.keys(data) });
      
      if (typeof chrome === 'undefined' || !chrome.storage) {
        debug.warn(this.component, '⚠️ Chrome storage API not available');
        return false;
      }

      await chrome.storage.local.set(data);
      debug.info(this.component, '✅ Storage data saved successfully');
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to set storage data', error as Error);
      return false;
    }
  }

  async getStorage(keys?: string | string[]): Promise<StorageData> {
    try {
      debug.debug(this.component, '📖 Getting storage data', { keys });
      
      if (typeof chrome === 'undefined' || !chrome.storage) {
        debug.warn(this.component, '⚠️ Chrome storage API not available');
        return {};
      }

      const data = await chrome.storage.local.get(keys);
      debug.info(this.component, '✅ Storage data retrieved', { keys: Object.keys(data) });
      return data;
    } catch (error) {
      debug.error(this.component, '❌ Failed to get storage data', error as Error);
      return {};
    }
  }

  async removeStorage(keys: string | string[]): Promise<boolean> {
    try {
      debug.debug(this.component, '🗑️ Removing storage data', { keys });
      
      if (typeof chrome === 'undefined' || !chrome.storage) {
        debug.warn(this.component, '⚠️ Chrome storage API not available');
        return false;
      }

      await chrome.storage.local.remove(keys);
      debug.info(this.component, '✅ Storage data removed successfully');
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to remove storage data', error as Error);
      return false;
    }
  }

  async clearStorage(): Promise<boolean> {
    try {
      debug.debug(this.component, '🧹 Clearing all storage data');
      
      if (typeof chrome === 'undefined' || !chrome.storage) {
        debug.warn(this.component, '⚠️ Chrome storage API not available');
        return false;
      }

      await chrome.storage.local.clear();
      debug.info(this.component, '✅ All storage data cleared');
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to clear storage data', error as Error);
      return false;
    }
  }

  // Download Management
  async downloadFile(url: string, filename: string): Promise<boolean> {
    try {
      debug.debug(this.component, '⬇️ Downloading file', { filename, url: url.substring(0, 50) + '...' });
      
      if (typeof chrome === 'undefined' || !chrome.downloads) {
        debug.warn(this.component, '⚠️ Chrome downloads API not available');
        return false;
      }

      const downloadId = await chrome.downloads.download({
        url,
        filename
      });
      
      debug.info(this.component, '✅ File download initiated', { downloadId, filename });
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to download file', error as Error);
      return false;
    }
  }

  // Clipboard Management
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      debug.debug(this.component, '📋 Copying to clipboard', { length: text.length });
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        debug.info(this.component, '✅ Text copied to clipboard');
        return true;
      } else {
        debug.warn(this.component, '⚠️ Clipboard API not available');
        return false;
      }
    } catch (error) {
      debug.error(this.component, '❌ Failed to copy to clipboard', error as Error);
      return false;
    }
  }

  async copyImageToClipboard(dataUrl: string): Promise<boolean> {
    try {
      debug.debug(this.component, '🖼️ Copying image to clipboard');
      
      if (navigator.clipboard) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        
        debug.info(this.component, '✅ Image copied to clipboard');
        return true;
      } else {
        debug.warn(this.component, '⚠️ Clipboard API not available');
        return false;
      }
    } catch (error) {
      debug.error(this.component, '❌ Failed to copy image to clipboard', error as Error);
      return false;
    }
  }

  // Notification Management
  async showNotification(title: string, message: string, iconUrl?: string): Promise<boolean> {
    try {
      debug.debug(this.component, '🔔 Showing notification', { title, message });
      
      if (typeof chrome === 'undefined' || !chrome.notifications) {
        debug.warn(this.component, '⚠️ Chrome notifications API not available');
        return false;
      }

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl || 'icon-128.png',
        title,
        message
      });
      
      debug.info(this.component, '✅ Notification shown');
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to show notification', error as Error);
      return false;
    }
  }

  // Permission Management
  async hasPermission(permission: string): Promise<boolean> {
    try {
      debug.debug(this.component, '🔒 Checking permission', { permission });
      
      if (typeof chrome === 'undefined' || !chrome.permissions) {
        debug.warn(this.component, '⚠️ Chrome permissions API not available');
        return false;
      }

      const result = chrome.permissions.contains({
        permissions: [permission as any]
      });
      const hasPermission = await result;
      
      debug.info(this.component, `✅ Permission check: ${permission} = ${hasPermission}`);
      return hasPermission;
    } catch (error) {
      debug.error(this.component, '❌ Failed to check permission', error as Error);
      return false;
    }
  }

  // Runtime Management
  sendMessage(message: any, responseCallback?: (response: any) => void): boolean {
    try {
      debug.debug(this.component, '📨 Sending runtime message', { type: message.type });
      
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        debug.warn(this.component, '⚠️ Chrome runtime API not available');
        return false;
      }

      chrome.runtime.sendMessage(message, responseCallback);
      debug.info(this.component, '✅ Runtime message sent');
      return true;
    } catch (error) {
      debug.error(this.component, '❌ Failed to send runtime message', error as Error);
      return false;
    }
  }

  // Extension State
  isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  }

  getExtensionVersion(): string {
    try {
      if (this.isExtensionContext()) {
        return chrome.runtime.getManifest().version;
      }
      return 'unknown';
    } catch (error) {
      debug.error(this.component, '❌ Failed to get extension version', error as Error);
      return 'unknown';
    }
  }
}

// Export singleton instance
export const chromeAPIs = ChromeAPIs.getInstance();
export default chromeAPIs; 