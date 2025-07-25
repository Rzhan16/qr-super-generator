import QRCode from 'qrcode';

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

/**
 * Generate QR code for email with mailto: protocol
 */
export async function generateEmailQR(email: string, subject?: string, body?: string, options: QROptions = {}): Promise<string> {
  let emailString = `mailto:${email}`;
  
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  if (params.length > 0) {
    emailString += `?${params.join('&')}`;
  }
  
  return generateQRCode(emailString, options);
}

/**
 * Generate QR code for phone number with tel: protocol
 */
export async function generatePhoneQR(phone: string, options: QROptions = {}): Promise<string> {
  const phoneString = `tel:${phone.replace(/[^+\d]/g, '')}`;
  return generateQRCode(phoneString, options);
}

/**
 * Generate QR code for SMS with predefined message
 */
export async function generateSMSQR(phone: string, message?: string, options: QROptions = {}): Promise<string> {
  let smsString = `sms:${phone.replace(/[^+\d]/g, '')}`;
  
  if (message) {
    smsString += `?body=${encodeURIComponent(message)}`;
  }
  
  return generateQRCode(smsString, options);
}

/**
 * Generate QR code for geographic location
 */
export async function generateLocationQR(latitude: number, longitude: number, options: QROptions = {}): Promise<string> {
  const locationString = `geo:${latitude},${longitude}`;
  return generateQRCode(locationString, options);
}

/**
 * Generate QR code with logo/image overlay (advanced)
 */
export async function generateQRCodeWithLogo(text: string, logoDataUrl: string, options: QROptions = {}): Promise<string> {
  try {
    // First generate the basic QR code
    const qrDataUrl = await generateQRCode(text, { ...options, errorCorrectionLevel: 'H' }); // Use high error correction for logo overlay
    
    // Create canvas for composition
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    const size = options.width || 256;
    canvas.width = size;
    canvas.height = size;
    
    // Load QR code image
    const qrImage = new Image();
    await new Promise((resolve, reject) => {
      qrImage.onload = resolve;
      qrImage.onerror = reject;
      qrImage.src = qrDataUrl;
    });
    
    // Draw QR code
    ctx.drawImage(qrImage, 0, 0, size, size);
    
    // Load logo image
    const logoImage = new Image();
    await new Promise((resolve, reject) => {
      logoImage.onload = resolve;
      logoImage.onerror = reject;
      logoImage.src = logoDataUrl;
    });
    
    // Calculate logo size (should be max 10% of QR code to maintain readability)
    const logoSize = Math.min(size * 0.1, 50);
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    
    // Draw white background circle for logo
    ctx.fillStyle = options.color?.light || '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoSize / 2 + 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw logo
    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
    
    return canvas.toDataURL(options.type || 'image/png');
  } catch (error) {
    console.error('Logo overlay failed, returning basic QR code:', error);
    // Fallback to basic QR code if logo overlay fails
    return generateQRCode(text, options);
  }
}

/**
 * Detect QR code type from text content
 */
export function detectQRType(text: string): 'url' | 'email' | 'phone' | 'sms' | 'wifi' | 'location' | 'vcard' | 'vevent' | 'text' {
  const trimmedText = text.trim().toLowerCase();
  
  if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://')) {
    return 'url';
  }
  
  if (trimmedText.startsWith('mailto:')) {
    return 'email';
  }
  
  if (trimmedText.startsWith('tel:')) {
    return 'phone';
  }
  
  if (trimmedText.startsWith('sms:')) {
    return 'sms';
  }
  
  if (trimmedText.startsWith('wifi:')) {
    return 'wifi';
  }
  
  if (trimmedText.startsWith('geo:')) {
    return 'location';
  }
  
  if (trimmedText.includes('begin:vcard')) {
    return 'vcard';
  }
  
  if (trimmedText.includes('begin:vevent')) {
    return 'vevent';
  }
  
  // Email detection by pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmedText)) {
    return 'email';
  }
  
  // Phone number detection by pattern
  const phoneRegex = /^[+]?[(]?[0-9\s().-]{10,}$/;
  if (phoneRegex.test(trimmedText)) {
    return 'phone';
  }
  
  // URL detection without protocol
  const urlRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  if (urlRegex.test(trimmedText)) {
    return 'url';
  }
  
  return 'text';
}

/**
 * Batch generate QR codes with progress callback
 */
export async function generateBatchQRCodesWithProgress(
  texts: string[],
  options: QROptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ text: string; dataUrl: string; error?: string }>> {
  const results: Array<{ text: string; dataUrl: string; error?: string }> = [];
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const dataUrl = await generateQRCode(texts[i], options);
      results.push({ text: texts[i], dataUrl });
    } catch (error) {
      results.push({
        text: texts[i],
        dataUrl: '',
        error: error instanceof Error ? error.message : 'Failed to generate QR code'
      });
    }
    
    onProgress?.(i + 1, texts.length);
    
    // Small delay to prevent UI blocking
    if (i < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}

/**
 * Generate QR code with custom error correction and validate
 */
export async function generateQRCodeAdvanced(
  text: string, 
  options: QROptions & { validate?: boolean } = {}
): Promise<{ dataUrl: string; size: number; errorLevel: string; textLength: number }> {
  const { validate = true, ...qrOptions } = options;
  
  if (validate) {
    const validation = validateQRText(text);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid QR text');
    }
  }
  
  const dataUrl = await generateQRCode(text, qrOptions);
  
  return {
    dataUrl,
    size: qrOptions.width || 256,
    errorLevel: qrOptions.errorCorrectionLevel || 'M',
    textLength: text.length
  };
} 