import QRCode from 'qrcode';
import { QRCodeData, QRGenerationOptions } from '../types/index';

export interface QROptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

export interface WiFiQRData {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface ContactQRData {
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
  url?: string;
}

export interface CalendarQRData {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}

/**
 * Generate QR code from text with customizable options
 */
export async function generateQRCode(text: string, options: QROptions = {}): Promise<string> {
  try {
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      width: options.width || 256,
      margin: options.margin || 1,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      type: options.type || 'image/png',
    };

    const dataUrl = await QRCode.toDataURL(text, qrOptions);
    return dataUrl;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code for WiFi credentials
 */
export async function generateWiFiQR(data: WiFiQRData, options: QROptions = {}): Promise<string> {
  const wifiString = `WIFI:T:${data.security};S:${data.ssid};P:${data.password};H:${data.hidden ? 'true' : 'false'};;`;
  return generateQRCode(wifiString, options);
}

/**
 * Generate QR code for contact information (vCard)
 */
export async function generateContactQR(data: ContactQRData, options: QROptions = {}): Promise<string> {
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    data.name ? `FN:${data.name}` : '',
    data.phone ? `TEL:${data.phone}` : '',
    data.email ? `EMAIL:${data.email}` : '',
    data.organization ? `ORG:${data.organization}` : '',
    data.url ? `URL:${data.url}` : '',
    'END:VCARD'
  ].filter(line => line !== '').join('\n');

  return generateQRCode(vcard, options);
}

/**
 * Generate QR code for calendar events
 */
export async function generateCalendarQR(data: CalendarQRData, options: QROptions = {}): Promise<string> {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const vevent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(data.start)}`,
    `DTEND:${formatDate(data.end)}`,
    `SUMMARY:${data.title}`,
    data.location ? `LOCATION:${data.location}` : '',
    data.description ? `DESCRIPTION:${data.description}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\n');

  return generateQRCode(vevent, options);
}

/**
 * Generate QR codes for multiple texts (batch processing)
 */
export async function generateBatchQRCodes(
  texts: string[], 
  options: QROptions = {}
): Promise<Array<{ text: string; dataUrl: string; error?: string }>> {
  const results = await Promise.allSettled(
    texts.map(async (text) => {
      const dataUrl = await generateQRCode(text, options);
      return { text, dataUrl };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        text: texts[index],
        dataUrl: '',
        error: result.reason?.message || 'Failed to generate QR code'
      };
    }
  });
}

/**
 * Validate QR code text
 */
export function validateQRText(text: string): { isValid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Text cannot be empty' };
  }

  if (text.length > 4296) {
    return { isValid: false, error: 'Text is too long (max 4296 characters)' };
  }

  return { isValid: true };
}

/**
 * Get optimal QR code size based on text length
 */
export function getOptimalSize(text: string): number {
  const length = text.length;
  
  if (length <= 100) return 200;
  if (length <= 300) return 256;
  if (length <= 800) return 320;
  if (length <= 1500) return 400;
  return 512;
}

/**
 * Estimate QR code capacity for different error correction levels
 */
export function getQRCapacity(errorLevel: 'L' | 'M' | 'Q' | 'H'): number {
  const capacities = {
    'L': 4296, // Low (7%)
    'M': 3391, // Medium (15%)
    'Q': 2420, // Quartile (25%)
    'H': 1852  // High (30%)
  };
  
  return capacities[errorLevel];
} 