/**
 * QR Super Generator - TypeScript Type Definitions
 * 
 * Comprehensive type definitions with validation helpers
 * for all QR code generation functionality
 */

import { debug } from '../utils/debug';

// QR Code Generation Types
export interface QRCodeData {
  id: string;
  text: string;
  dataUrl: string;
  timestamp: string;
  title: string;
  type: QRCodeType;
  metadata: QRCodeMetadata;
  fromShortcut?: boolean;
}

export type QRCodeType = 'url' | 'text' | 'wifi' | 'contact' | 'calendar' | 'email' | 'phone' | 'sms' | 'custom';

export interface QRCodeMetadata {
  size: number;
  errorLevel: ErrorCorrectionLevel;
  color: QRColorScheme;
  format: string;
  margin?: number;
  logo?: string;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRColorScheme {
  dark: string;
  light: string;
}

export interface QRGenerationOptions {
  width?: number;
  height?: number;
  margin?: number;
  color?: QRColorScheme;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  type?: string;
  quality?: number;
  scale?: number;
}

// Specialized QR Types
export interface WiFiQRData {
  ssid: string;
  password: string;
  security: WiFiSecurity;
  hidden?: boolean;
}

export type WiFiSecurity = 'WPA' | 'WEP' | 'nopass';

export interface ContactQRData {
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  url?: string;
  address?: ContactAddress;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
}

// Extension State Management
export interface ExtensionState {
  currentTab?: ChromeTab;
  qrHistory: QRCodeData[];
  settings: ExtensionSettings;
  analytics: AnalyticsData;
  debugMode: boolean;
}

export interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
}

export interface ExtensionSettings {
  defaultSize: number;
  defaultErrorCorrection: ErrorCorrectionLevel;
  defaultColors: QRColorScheme;
  autoGenerate: boolean;
  showNotifications: boolean;
  theme: ThemeMode;
  debugMode: boolean;
  maxHistorySize: number;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

// Analytics and Performance
export interface AnalyticsData {
  totalGenerated: number;
  typeDistribution: Record<QRCodeType, number>;
  dailyUsage: Record<string, number>;
  averageGenerationTime: number;
  mostUsedFeatures: string[];
  errorCount: number;
  lastUpdated: string;
}

export interface PerformanceMetrics {
  generationTime: number;
  renderTime: number;
  memoryUsage?: number;
  component: string;
  timestamp: Date;
}

// User Interface Types
export interface UIState {
  activeTab: TabType;
  loading: boolean;
  error: string | null;
  debugPanelOpen: boolean;
  selectedQRCodes: string[];
}

export type TabType = 'quick' | 'generator' | 'history' | 'analytics' | 'settings' | 'debug';

export interface FormState {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitting: boolean;
}

// API and Storage Types
export interface StorageData {
  qrHistory: QRCodeData[];
  settings: ExtensionSettings;
  analytics: AnalyticsData;
  debugLogs?: any[];
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface QRValidationRules {
  maxLength: number;
  minLength: number;
  allowedCharacters?: RegExp;
  requiredFields?: string[];
}

// Event Types
export interface QRGeneratedEvent {
  type: 'qr-generated';
  data: QRCodeData;
  source: 'popup' | 'shortcut' | 'context-menu';
  timestamp: string;
}

export interface UserActionEvent {
  type: 'user-action';
  action: string;
  component: string;
  data?: any;
  timestamp: string;
}

export interface ErrorEvent {
  type: 'error';
  error: Error;
  component: string;
  context?: any;
  timestamp: string;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

// Type Guards and Validation Functions
export class TypeValidator {
  static isQRCodeData(obj: any): obj is QRCodeData {
    debug.trace('TypeValidator', 'Validating QRCodeData', obj);
    
    if (!obj || typeof obj !== 'object') {
      debug.error('TypeValidator', 'QRCodeData validation failed: not an object', undefined, obj);
      return false;
    }

    const required = ['id', 'text', 'dataUrl', 'timestamp', 'title', 'type', 'metadata'];
    for (const field of required) {
      if (!(field in obj)) {
        debug.error('TypeValidator', `QRCodeData validation failed: missing field '${field}'`);
        return false;
      }
    }

    if (typeof obj.text !== 'string' || obj.text.length === 0) {
      debug.error('TypeValidator', 'QRCodeData validation failed: invalid text field');
      return false;
    }

    if (!obj.dataUrl.startsWith('data:image/')) {
      debug.error('TypeValidator', 'QRCodeData validation failed: invalid dataUrl');
      return false;
    }

    debug.debug('TypeValidator', 'QRCodeData validation passed');
    return true;
  }

  static isWiFiQRData(obj: any): obj is WiFiQRData {
    debug.trace('TypeValidator', 'Validating WiFiQRData', obj);
    
    if (!obj || typeof obj !== 'object') return false;
    
    if (typeof obj.ssid !== 'string' || obj.ssid.length === 0) {
      debug.error('TypeValidator', 'WiFiQRData validation failed: invalid SSID');
      return false;
    }

    if (!['WPA', 'WEP', 'nopass'].includes(obj.security)) {
      debug.error('TypeValidator', 'WiFiQRData validation failed: invalid security type');
      return false;
    }

    if (obj.security !== 'nopass' && typeof obj.password !== 'string') {
      debug.error('TypeValidator', 'WiFiQRData validation failed: password required for secured networks');
      return false;
    }

    debug.debug('TypeValidator', 'WiFiQRData validation passed');
    return true;
  }

  static isContactQRData(obj: any): obj is ContactQRData {
    debug.trace('TypeValidator', 'Validating ContactQRData', obj);
    
    if (!obj || typeof obj !== 'object') return false;

    // At least one contact field must be present
    const contactFields = ['firstName', 'lastName', 'organization', 'phone', 'email'];
    const hasContactField = contactFields.some(field => 
      field in obj && typeof obj[field] === 'string' && obj[field].length > 0
    );

    if (!hasContactField) {
      debug.error('TypeValidator', 'ContactQRData validation failed: no valid contact fields');
      return false;
    }

    debug.debug('TypeValidator', 'ContactQRData validation passed');
    return true;
  }

  static validateQRText(text: string): ValidationResult {
    debug.trace('TypeValidator', 'Validating QR text', { length: text.length });
    
    const errors: string[] = [];
    
    if (!text || typeof text !== 'string') {
      errors.push('Text must be a non-empty string');
    } else {
      if (text.length === 0) {
        errors.push('Text cannot be empty');
      }
      
      if (text.length > 4296) {
        errors.push(`Text too long (${text.length}/4296 characters)`);
      }
      
      // Check for potentially problematic characters
      if (text.includes('\0')) {
        errors.push('Text contains null characters');
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors
    };

    debug.debug('TypeValidator', 'QR text validation result', result);
    return result;
  }

  static validateURL(url: string): ValidationResult {
    debug.trace('TypeValidator', 'Validating URL', url);
    
    const errors: string[] = [];
    
    try {
      new URL(url);
    } catch (e) {
      errors.push('Invalid URL format');
    }

    const result = {
      isValid: errors.length === 0,
      errors
    };

    debug.debug('TypeValidator', 'URL validation result', result);
    return result;
  }

  static validateEmail(email: string): ValidationResult {
    debug.trace('TypeValidator', 'Validating email', email);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];
    
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    const result = {
      isValid: errors.length === 0,
      errors
    };

    debug.debug('TypeValidator', 'Email validation result', result);
    return result;
  }

  static validatePhone(phone: string): ValidationResult {
    debug.trace('TypeValidator', 'Validating phone', phone);
    
    // Remove common phone formatting
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    const errors: string[] = [];
    
    if (!/^\d{7,15}$/.test(cleanPhone)) {
      errors.push('Phone number must be 7-15 digits');
    }

    const result = {
      isValid: errors.length === 0,
      errors
    };

    debug.debug('TypeValidator', 'Phone validation result', result);
    return result;
  }
}

// Default values and constants
export const DEFAULT_QR_OPTIONS: Required<QRGenerationOptions, 'width' | 'margin' | 'errorCorrectionLevel'> = {
  width: 256,
  margin: 1,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  type: 'image/png',
  quality: 1,
  scale: 4
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultSize: 256,
  defaultErrorCorrection: 'M',
  defaultColors: {
    dark: '#9333ea',
    light: '#ffffff'
  },
  autoGenerate: true,
  showNotifications: true,
  theme: 'dark',
  debugMode: process.env.NODE_ENV === 'development',
  maxHistorySize: 100
};

export const QR_SIZE_OPTIONS = [128, 256, 512, 1024] as const;
export const ERROR_CORRECTION_LEVELS: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
export const QR_TYPES: QRCodeType[] = ['url', 'text', 'wifi', 'contact', 'calendar', 'email', 'phone', 'sms', 'custom'];

// Test data for immediate testing
export const TEST_QR_DATA: Partial<QRCodeData>[] = [
  {
    id: 'test-1',
    text: 'https://github.com/JohnBra/vite-web-extension',
    title: 'Test URL - GitHub Repository',
    type: 'url'
  },
  {
    id: 'test-2',
    text: 'Hello, QR Super Generator! This is a test message.',
    title: 'Test Text Message',
    type: 'text'
  },
  {
    id: 'test-3',
    text: 'WIFI:T:WPA;S:TestNetwork;P:testpassword123;H:false;;',
    title: 'Test WiFi Network',
    type: 'wifi'
  }
];

export const TEST_WIFI_DATA: WiFiQRData = {
  ssid: 'QR-Test-Network',
  password: 'secure123',
  security: 'WPA',
  hidden: false
};

export const TEST_CONTACT_DATA: ContactQRData = {
  firstName: 'John',
  lastName: 'Doe',
  organization: 'QR Super Corp',
  phone: '+1-555-123-4567',
  email: 'contact@qr-generator.com',
  url: 'https://johndoe.com'
};

export default {
  TypeValidator,
  DEFAULT_QR_OPTIONS,
  DEFAULT_SETTINGS,
  QR_SIZE_OPTIONS,
  ERROR_CORRECTION_LEVELS,
  QR_TYPES,
  TEST_QR_DATA,
  TEST_WIFI_DATA,
  TEST_CONTACT_DATA
};