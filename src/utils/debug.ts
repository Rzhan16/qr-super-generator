/**
 * QR Super Generator - Comprehensive Debugging Utilities
 * 
 * This module provides extensive debugging capabilities including:
 * - Structured logging with levels
 * - Performance monitoring
 * - State tracking
 * - Error reporting
 * - Console grouping for better organization
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  enablePerformance: boolean;
  enableStateTracking: boolean;
  enableErrorBoundary: boolean;
  maxLogEntries: number;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  stack?: string;
  performance?: {
    duration: number;
    memory?: number;
  };
}

export interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  component: string;
}

class DebugLogger {
  private config: DebugConfig;
  private logs: LogEntry[] = [];
  private performanceEntries: Map<string, PerformanceEntry> = new Map();
  private stateHistory: any[] = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: true,
      level: LogLevel.DEBUG,
      enablePerformance: true,
      enableStateTracking: true,
      enableErrorBoundary: true,
      maxLogEntries: 1000,
      ...config
    };

    console.log(`%c🔧 QR Super Generator Debug Mode Enabled`, 
      'background: linear-gradient(45deg, #9333ea, #3b82f6); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold;');
    
    this.logSystemInfo();
  }

  private logSystemInfo() {
    console.group('🖥️ System Information');
    console.log('User Agent:', navigator.userAgent);
    console.log('Chrome Version:', this.getChromeVersion());
    console.log('Extension Environment:', this.getExtensionEnvironment());
    console.log('Memory Info:', this.getMemoryInfo());
    console.log('Storage Info:', this.getStorageInfo());
    console.groupEnd();
  }

  private getChromeVersion(): string {
    const match = navigator.userAgent.match(/Chrome\/([0-9.]+)/);
    return match ? match[1] : 'Unknown';
  }

  private getExtensionEnvironment(): string {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome.runtime.getManifest().name + ' v' + chrome.runtime.getManifest().version;
    }
    return 'Development Environment';
  }

  private getMemoryInfo(): any {
    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      };
    }
    return 'Not available';
  }

  private async getStorageInfo(): Promise<any> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(null);
        const keys = Object.keys(result);
        return {
          totalKeys: keys.length,
          estimatedSize: JSON.stringify(result).length + ' bytes'
        };
      }
    } catch (error) {
      return 'Not available in current context';
    }
    return 'Chrome storage not available';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  private getLogColor(level: LogLevel): string {
    const colors = {
      [LogLevel.TRACE]: '#6b7280',
      [LogLevel.DEBUG]: '#3b82f6',
      [LogLevel.INFO]: '#10b981',
      [LogLevel.WARN]: '#f59e0b',
      [LogLevel.ERROR]: '#ef4444',
      [LogLevel.FATAL]: '#dc2626'
    };
    return colors[level];
  }

  private getLogEmoji(level: LogLevel): string {
    const emojis = {
      [LogLevel.TRACE]: '🔍',
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.FATAL]: '💀'
    };
    return emojis[level];
  }

  private formatMessage(level: LogLevel, component: string, message: string): string {
    const emoji = this.getLogEmoji(level);
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return `${emoji} [${timestamp}] [${component}] ${message}`;
  }

  private log(level: LogLevel, component: string, message: string, data?: any, error?: Error) {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      message,
      data,
      stack: error?.stack
    };

    // Add to internal log storage
    this.logs.push(logEntry);
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output with styling
    const formattedMessage = this.formatMessage(level, component, message);
    const color = this.getLogColor(level);
    const style = `color: ${color}; font-weight: ${level >= LogLevel.WARN ? 'bold' : 'normal'}`;

    if (data) {
      console.group(`%c${formattedMessage}`, style);
      console.log('Data:', data);
      if (error) {
        console.error('Error:', error);
      }
      console.groupEnd();
    } else {
      if (level >= LogLevel.ERROR) {
        console.error(`%c${formattedMessage}`, style, error || '');
      } else if (level >= LogLevel.WARN) {
        console.warn(`%c${formattedMessage}`, style);
      } else {
        console.log(`%c${formattedMessage}`, style);
      }
    }
  }

  // Public logging methods
  trace(component: string, message: string, data?: any) {
    this.log(LogLevel.TRACE, component, message, data);
  }

  debug(component: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  info(component: string, message: string, data?: any) {
    this.log(LogLevel.INFO, component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.log(LogLevel.WARN, component, message, data);
  }

  error(component: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, component, message, data, error);
  }

  fatal(component: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.FATAL, component, message, data, error);
  }

  // Performance monitoring
  startPerformance(name: string, component: string): void {
    if (!this.config.enablePerformance) return;

    const entry: PerformanceEntry = {
      name,
      startTime: performance.now(),
      component
    };
    
    this.performanceEntries.set(name, entry);
    this.debug(component, `⏱️ Performance: Started '${name}'`);
  }

  endPerformance(name: string, component: string): number | null {
    if (!this.config.enablePerformance) return null;

    const entry = this.performanceEntries.get(name);
    if (!entry) {
      this.warn(component, `⏱️ Performance: No start time found for '${name}'`);
      return null;
    }

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;

    this.info(component, `⏱️ Performance: '${name}' completed`, {
      duration: `${entry.duration.toFixed(2)}ms`,
      component: entry.component
    });

    this.performanceEntries.delete(name);
    return entry.duration;
  }

  // State tracking
  trackState(component: string, stateName: string, state: any): void {
    if (!this.config.enableStateTracking) return;

    const stateEntry = {
      timestamp: new Date(),
      component,
      stateName,
      state: JSON.parse(JSON.stringify(state)) // Deep clone
    };

    this.stateHistory.push(stateEntry);
    this.debug(component, `📊 State: '${stateName}' updated`, state);

    // Keep history manageable
    if (this.stateHistory.length > 100) {
      this.stateHistory = this.stateHistory.slice(-100);
    }
  }

  // Function call tracking
  trackFunction(component: string, functionName: string, args?: any[]): void {
    this.debug(component, `🎯 Function: '${functionName}' called`, {
      arguments: args,
      timestamp: new Date().toISOString()
    });
  }

  // Event tracking
  trackEvent(component: string, eventName: string, eventData?: any): void {
    this.info(component, `📡 Event: '${eventName}'`, eventData);
  }

  // User interaction tracking
  trackUserAction(component: string, action: string, element?: string, data?: any): void {
    this.info(component, `👆 User Action: ${action}${element ? ` on '${element}'` : ''}`, data);
  }

  // Debug panel data
  getDebugData() {
    return {
      logs: this.logs.slice(-50), // Last 50 logs
      stateHistory: this.stateHistory.slice(-20), // Last 20 state changes
      performance: Array.from(this.performanceEntries.values()),
      config: this.config,
      systemInfo: {
        chromeVersion: this.getChromeVersion(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Clear methods for testing
  clearLogs(): void {
    this.logs = [];
    this.info('DebugLogger', '🧹 Logs cleared');
  }

  clearState(): void {
    this.stateHistory = [];
    this.info('DebugLogger', '🧹 State history cleared');
  }

  clearPerformance(): void {
    this.performanceEntries.clear();
    this.info('DebugLogger', '🧹 Performance entries cleared');
  }

  // Export debug data
  exportDebugData(): string {
    const debugData = this.getDebugData();
    return JSON.stringify(debugData, null, 2);
  }

  // Validation helpers
  validateQRData(data: any, component: string): boolean {
    this.debug(component, '🔍 Validating QR data', data);
    
    if (!data) {
      this.error(component, '❌ Validation: QR data is null or undefined');
      return false;
    }

    if (typeof data.text !== 'string') {
      this.error(component, '❌ Validation: QR text must be a string', { type: typeof data.text });
      return false;
    }

    if (data.text.length === 0) {
      this.error(component, '❌ Validation: QR text cannot be empty');
      return false;
    }

    if (data.text.length > 4296) {
      this.error(component, '❌ Validation: QR text too long', { length: data.text.length, max: 4296 });
      return false;
    }

    this.debug(component, '✅ Validation: QR data is valid');
    return true;
  }
}

// Create global debug instance
export const debug = new DebugLogger({
      enabled: process.env.NODE_ENV === 'development' || (typeof localStorage !== 'undefined' && localStorage.getItem('debug-enabled') === 'true'),
  level: LogLevel.DEBUG
});

// Error boundary helper
export class DebugErrorBoundary {
  static wrapComponent(component: string, fn: Function): Function {
    return (...args: any[]) => {
      try {
        debug.trackFunction(component, fn.name, args);
        const result = fn.apply(this, args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            debug.error(component, `Promise rejection in ${fn.name}`, error);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        debug.error(component, `Error in ${fn.name}`, error as Error);
        throw error;
      }
    };
  }
}

// Window debugging helpers (for development)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.qrDebug = debug;
  // @ts-ignore
  window.clearQRLogs = () => debug.clearLogs();
  // @ts-ignore
  window.exportQRDebug = () => debug.exportDebugData();
}

export default debug;