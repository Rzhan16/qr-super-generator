/**
 * Chrome Extension APIs utility functions
 * Provides typed wrappers for Chrome extension APIs
 */

export interface Tab {
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

/**
 * Get the currently active tab
 */
export async function getCurrentTab(): Promise<Tab> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (tabs.length === 0) {
        reject(new Error('No active tab found'));
        return;
      }

      resolve(tabs[0]);
    });
  });
}

/**
 * Get all tabs in the current window
 */
export async function getAllTabs(): Promise<Tab[]> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs);
    });
  });
}

/**
 * Get all tabs across all windows
 */
export async function getAllTabsAllWindows(): Promise<Tab[]> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs);
    });
  });
}

/**
 * Download a file using Chrome downloads API
 */
export async function downloadFile(dataUrl: string, filename: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!chrome?.downloads) {
      reject(new Error('Chrome downloads API not available'));
      return;
    }

    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(downloadId);
    });
  });
}

/**
 * Save data to Chrome storage
 */
export async function saveToStorage(data: StorageData): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      reject(new Error('Chrome storage API not available'));
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
}

/**
 * Get data from Chrome storage
 */
export async function getFromStorage(keys: string | string[] | null = null): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      reject(new Error('Chrome storage API not available'));
      return;
    }

    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(result);
    });
  });
}

/**
 * Remove data from Chrome storage
 */
export async function removeFromStorage(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      reject(new Error('Chrome storage API not available'));
      return;
    }

    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

/**
 * Clear all data from Chrome storage
 */
export async function clearStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      reject(new Error('Chrome storage API not available'));
      return;
    }

    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

/**
 * Send message to background script
 */
export async function sendMessageToBackground(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime) {
      reject(new Error('Chrome runtime API not available'));
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

/**
 * Send message to content script
 */
export async function sendMessageToTab(tabId: number, message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

/**
 * Create a new tab
 */
export async function createTab(url: string, active: boolean = true): Promise<Tab> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tab) {
        reject(new Error('Failed to create tab'));
        return;
      }

      resolve(tab);
    });
  });
}

/**
 * Update tab URL
 */
export async function updateTab(tabId: number, url: string): Promise<Tab> {
  return new Promise((resolve, reject) => {
    if (!chrome?.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    chrome.tabs.update(tabId, { url }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tab) {
        reject(new Error('Failed to update tab'));
        return;
      }

      resolve(tab);
    });
  });
}

/**
 * Check if Chrome extension APIs are available
 */
export function isExtensionEnvironment(): boolean {
  return typeof chrome !== 'undefined' && 
         chrome.runtime && 
         chrome.runtime.id !== undefined;
}

/**
 * Get extension information
 */
export function getExtensionInfo() {
  if (!isExtensionEnvironment()) {
    throw new Error('Not in extension environment');
  }

  return {
    id: chrome.runtime.id,
    version: chrome.runtime.getManifest()?.version,
    name: chrome.runtime.getManifest()?.name
  };
} 