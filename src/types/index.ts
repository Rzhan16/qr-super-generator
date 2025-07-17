/**
 * TypeScript definitions for QR Super Generator Chrome Extension
 */

// QR Code related types
export interface QRCodeData {
  id: number;
  text: string;
  dataUrl: string;
  timestamp: string;
  title: string;
  type?: 'url' | 'text' | 'wifi' | 'contact' | 'calendar' | 'custom';
  fromShortcut?: boolean;
  metadata?: {
    size?: number;
    errorLevel?: string;
    color?: {
      dark: string;
      light: string;
    };
  };
}

export interface QRGenerationOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface WiFiCredentials {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface ContactInfo {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  jobTitle?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  organizer?: string;
  url?: string;
}

// Chrome Extension types
export interface ExtensionTab {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
  windowId?: number;
  index?: number;
  pinned?: boolean;
  highlighted?: boolean;
  incognito?: boolean;
}

export interface ChromeMessage {
  action: string;
  data?: any;
  tabId?: number;
  timestamp?: string;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Storage types
export interface ExtensionSettings {
  qrOptions: QRGenerationOptions;
  preferences: UserPreferences;
  analytics: AnalyticsData;
  qrHistory?: QRCodeData[];
}

export interface UserPreferences {
  autoDownload: boolean;
  showNotifications: boolean;
  defaultFilename: string;
  theme?: 'light' | 'dark' | 'auto';
  defaultQRType: 'url' | 'text' | 'wifi' | 'contact' | 'calendar';
  batchLimit: number;
  compressionLevel: 'low' | 'medium' | 'high';
  copyBehavior: 'image' | 'url' | 'both';
}

export interface AnalyticsData {
  enabled: boolean;
  installDate: string;
  qrCodesGenerated: number;
  timesOpened: number;
  lastGenerated?: string;
  lastOpened?: string;
  featuresUsed: {
    batchGeneration?: number;
    wifiQR?: number;
    contactQR?: number;
    calendarQR?: number;
    customText?: number;
    shortcuts?: number;
  };
  averageQRSize: number;
  mostUsedErrorLevel: string;
  totalDownloads: number;
}

// UI Component types
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  selected?: boolean;
}

export interface QRPreviewProps {
  dataUrl: string;
  text: string;
  options: QRGenerationOptions;
  onDownload: () => void;
  onCopy: () => void;
  onShare?: () => void;
}

export interface BatchGenerationResult {
  successful: Array<{
    text: string;
    dataUrl: string;
    title: string;
  }>;
  failed: Array<{
    text: string;
    error: string;
    title: string;
  }>;
  total: number;
  zipUrl?: string;
}

// Error types
export interface ExtensionError {
  code: string;
  message: string;
  timestamp: string;
  context?: {
    action?: string;
    url?: string;
    userAgent?: string;
  };
}

export type ErrorCode = 
  | 'QR_GENERATION_FAILED'
  | 'STORAGE_ERROR'
  | 'DOWNLOAD_FAILED'
  | 'CLIPBOARD_ERROR'
  | 'TAB_ACCESS_DENIED'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED';

// Event types
export interface QRGeneratedEvent {
  type: 'qr-generated';
  data: {
    qrData: QRCodeData;
    source: 'popup' | 'shortcut' | 'context-menu' | 'batch';
    timestamp: string;
  };
}

export interface BatchCompleteEvent {
  type: 'batch-complete';
  data: {
    result: BatchGenerationResult;
    duration: number;
    timestamp: string;
  };
}

export interface SettingsChangedEvent {
  type: 'settings-changed';
  data: {
    setting: keyof ExtensionSettings;
    oldValue: any;
    newValue: any;
    timestamp: string;
  };
}

export type ExtensionEvent = QRGeneratedEvent | BatchCompleteEvent | SettingsChangedEvent;

// API Response types
export interface QRServiceResponse {
  success: boolean;
  data?: {
    dataUrl: string;
    size: number;
    format: string;
  };
  error?: {
    code: ErrorCode;
    message: string;
  };
}

export interface TabsResponse {
  success: boolean;
  data?: ExtensionTab[];
  error?: string;
}

export interface StorageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Utility types
export type QRType = 'url' | 'text' | 'wifi' | 'contact' | 'calendar' | 'email' | 'phone' | 'sms';

export type FileFormat = 'png' | 'jpg' | 'svg' | 'pdf';

export type ColorScheme = 'light' | 'dark' | 'auto';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// React component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export interface InputProps extends BaseComponentProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  type?: 'text' | 'email' | 'url' | 'password' | 'tel';
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Hook types
export interface UseQRGeneratorReturn {
  generateQR: (text: string, options?: QRGenerationOptions) => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

export interface UseStorageReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  save: (data: T) => Promise<void>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseTabsReturn {
  tabs: ExtensionTab[];
  currentTab: ExtensionTab | null;
  loading: boolean;
  error: string | null;
  refreshTabs: () => Promise<void>;
  getCurrentTab: () => Promise<ExtensionTab | null>;
}

// Context types
export interface AppContextType {
  settings: ExtensionSettings;
  updateSettings: (settings: Partial<ExtensionSettings>) => Promise<void>;
  analytics: AnalyticsData;
  updateAnalytics: (data: Partial<AnalyticsData>) => Promise<void>;
  qrHistory: QRCodeData[];
  addToHistory: (qr: QRCodeData) => Promise<void>;
  clearHistory: () => Promise<void>;
}

// Constants
export const QR_SIZES = {
  SMALL: 128,
  MEDIUM: 256,
  LARGE: 512,
  XLARGE: 1024
} as const;

export const ERROR_LEVELS = {
  LOW: 'L',
  MEDIUM: 'M', 
  QUARTILE: 'Q',
  HIGH: 'H'
} as const;

export const QR_FORMATS = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp'
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'qr_settings',
  HISTORY: 'qr_history', 
  ANALYTICS: 'qr_analytics',
  PREFERENCES: 'qr_preferences'
} as const;

// Type guards
export function isValidQRText(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 4296;
}

export function isExtensionTab(tab: unknown): tab is ExtensionTab {
  return typeof tab === 'object' && tab !== null && 'url' in tab && 'title' in tab;
}

export function isQRCodeData(data: unknown): data is QRCodeData {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'text' in data && 
         'dataUrl' in data && 
         'timestamp' in data;
}

// Branded types for type safety
export type QRDataUrl = string & { readonly brand: unique symbol };
export type TabId = number & { readonly brand: unique symbol };
export type Timestamp = string & { readonly brand: unique symbol };

// Note: All types are exported as named exports above
// Default export removed to avoid TypeScript compilation issues 