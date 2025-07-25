/**
 * QR Super Generator - Core QR Generation Service
 * 
 * Comprehensive QR code generation service with debugging,
 * error handling, validation, and testing capabilities
 */

import QRCode from 'qrcode';
import { debug } from './debug';
import {
  QRCodeData,
  QRGenerationOptions,
  WiFiQRData,
  ContactQRData,
  CalendarEventData,
  QRCodeType,
  TypeValidator,
  DEFAULT_QR_OPTIONS,
  TEST_QR_DATA,
  TEST_WIFI_DATA,
  TEST_CONTACT_DATA
} from '../types';

export class QRGenerationService {
  private static instance: QRGenerationService;
  private generationCount = 0;
  private totalGenerationTime = 0;

  private constructor() {
    debug.info('QRGenerationService', '🚀 QR Generation Service initialized');
    this.runInitialTests();
  }

  public static getInstance(): QRGenerationService {
    if (!QRGenerationService.instance) {
      QRGenerationService.instance = new QRGenerationService();
    }
    return QRGenerationService.instance;
  }

  /**
   * Generate QR code from text with comprehensive debugging
   */
  public async generateQRCode(
    text: string,
    options: Partial<QRGenerationOptions> = {},
    type: QRCodeType = 'text'
  ): Promise<QRCodeData> {
    const startTime = performance.now();
    const component = 'QRGenerationService';
    
    debug.startPerformance('qr-generation', component);
    debug.info(component, '🎯 Starting QR generation', { text: text.substring(0, 50) + '...', type, options });

    try {
      // Validate input
      const validation = TypeValidator.validateQRText(text);
      if (!validation.isValid) {
        const error = new Error(`QR text validation failed: ${validation.errors.join(', ')}`);
        debug.error(component, '❌ QR generation failed - validation error', error, { text, validation });
        throw error;
      }

      // Merge options with defaults
      const finalOptions: QRGenerationOptions = {
        ...DEFAULT_QR_OPTIONS,
        ...options
      };

      debug.debug(component, '⚙️ Using QR options', finalOptions);

      // Generate QR code
      const qrCodeOptions: any = {
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
        type: finalOptions.type || 'image/png'
      };

      debug.debug(component, '🔧 QRCode.js options', qrCodeOptions);

      let dataUrl: string;
      try {
        dataUrl = await QRCode.toDataURL(text, qrCodeOptions) as unknown as string;
      } catch (qrError) {
        const error = new Error(`QR generation failed: ${(qrError as Error).message}`);
        debug.error(component, '❌ QR generation library error', error, { text, options: qrCodeOptions });
        throw error;
      }
      
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        const error = new Error('QR generation returned invalid data URL');
        debug.error(component, '❌ Invalid data URL generated', error, { dataUrl: dataUrl?.substring(0, 100) });
        throw error;
      }

      // Create QR code data object
      const qrData: QRCodeData = {
        id: this.generateId(),
        text,
        dataUrl,
        timestamp: new Date().toISOString(),
        title: this.generateTitle(text, type),
        type,
        metadata: {
          size: finalOptions.width || 256,
          errorLevel: finalOptions.errorCorrectionLevel || 'M',
          color: finalOptions.color || { dark: '#000000', light: '#FFFFFF' },
          format: 'PNG',
          margin: finalOptions.margin
        }
      };

      // Performance tracking
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      debug.endPerformance('qr-generation', component);

      this.generationCount++;
      this.totalGenerationTime += generationTime;

      debug.info(component, '✅ QR generation successful', {
        id: qrData.id,
        type: qrData.type,
        size: qrData.metadata.size,
        generationTime: `${generationTime.toFixed(2)}ms`,
        averageTime: `${(this.totalGenerationTime / this.generationCount).toFixed(2)}ms`,
        totalGenerated: this.generationCount
      });

      // Validate the generated QR data
      if (!TypeValidator.isQRCodeData(qrData)) {
        const error = new Error('Generated QR data failed validation');
        debug.error(component, '❌ Generated QR data validation failed', error, qrData);
        throw error;
      }

      debug.debug(component, '📊 QR data structure', qrData);
      
      return qrData;

    } catch (error) {
      debug.endPerformance('qr-generation', component);
      debug.error(component, '💥 QR generation failed', error as Error, { text, options, type });
      throw error;
    }
  }

  /**
   * Generate WiFi QR code
   */
  public async generateWiFiQR(wifiData: WiFiQRData, options: Partial<QRGenerationOptions> = {}): Promise<QRCodeData> {
    const component = 'QRGenerationService.WiFi';
    debug.info(component, '📶 Generating WiFi QR code', { ssid: wifiData.ssid, security: wifiData.security });

    try {
      // Validate WiFi data
      if (!TypeValidator.isWiFiQRData(wifiData)) {
        const error = new Error('Invalid WiFi data provided');
        debug.error(component, '❌ WiFi data validation failed', error, wifiData);
        throw error;
      }

      // Create WiFi QR string
      const wifiString = `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password || ''};H:${wifiData.hidden ? 'true' : 'false'};;`;
      debug.debug(component, '📝 WiFi QR string generated', { length: wifiString.length });

      return this.generateQRCode(wifiString, options, 'wifi');
    } catch (error) {
      debug.error(component, '💥 WiFi QR generation failed', error as Error, wifiData);
      throw error;
    }
  }

  /**
   * Generate Contact (vCard) QR code
   */
  public async generateContactQR(contactData: ContactQRData, options: Partial<QRGenerationOptions> = {}): Promise<QRCodeData> {
    const component = 'QRGenerationService.Contact';
    debug.info(component, '👤 Generating contact QR code', contactData);

    try {
      // Validate contact data
      if (!TypeValidator.isContactQRData(contactData)) {
        const error = new Error('Invalid contact data provided');
        debug.error(component, '❌ Contact data validation failed', error, contactData);
        throw error;
      }

      // Create vCard string
      const vCardLines = [
        'BEGIN:VCARD',
        'VERSION:3.0'
      ];

      if (contactData.firstName || contactData.lastName) {
        const fullName = `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
        vCardLines.push(`FN:${fullName}`);
        vCardLines.push(`N:${contactData.lastName || ''};${contactData.firstName || ''};;;`);
      }

      if (contactData.organization) {
        vCardLines.push(`ORG:${contactData.organization}`);
      }

      if (contactData.title) {
        vCardLines.push(`TITLE:${contactData.title}`);
      }

      if (contactData.phone) {
        vCardLines.push(`TEL:${contactData.phone}`);
      }

      if (contactData.email) {
        vCardLines.push(`EMAIL:${contactData.email}`);
      }

      if (contactData.url) {
        vCardLines.push(`URL:${contactData.url}`);
      }

      if (contactData.address) {
        const addr = contactData.address;
        const addrLine = `ADR:;;${addr.street || ''};${addr.city || ''};${addr.state || ''};${addr.zip || ''};${addr.country || ''}`;
        vCardLines.push(addrLine);
      }

      vCardLines.push('END:VCARD');

      const vCardString = vCardLines.join('\n');
      debug.debug(component, '📄 vCard string generated', { lines: vCardLines.length, length: vCardString.length });

      return this.generateQRCode(vCardString, options, 'contact');
    } catch (error) {
      debug.error(component, '💥 Contact QR generation failed', error as Error, contactData);
      throw error;
    }
  }

  /**
   * Generate Calendar Event QR code
   */
  public async generateCalendarQR(eventData: CalendarEventData, options: Partial<QRGenerationOptions> = {}): Promise<QRCodeData> {
    const component = 'QRGenerationService.Calendar';
    debug.info(component, '📅 Generating calendar QR code', eventData);

    try {
      const formatDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const vEventLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `DTSTART:${formatDate(eventData.startDate)}`,
        `DTEND:${formatDate(eventData.endDate)}`,
        `SUMMARY:${eventData.title}`
      ];

      if (eventData.description) {
        vEventLines.push(`DESCRIPTION:${eventData.description}`);
      }

      if (eventData.location) {
        vEventLines.push(`LOCATION:${eventData.location}`);
      }

      vEventLines.push('END:VEVENT', 'END:VCALENDAR');

      const vEventString = vEventLines.join('\n');
      debug.debug(component, '📋 Calendar event string generated', { lines: vEventLines.length, length: vEventString.length });

      return this.generateQRCode(vEventString, options, 'calendar');
    } catch (error) {
      debug.error(component, '💥 Calendar QR generation failed', error as Error, eventData);
      throw error;
    }
  }

  /**
   * Generate Email QR code
   */
  public async generateEmailQR(
    email: string,
    subject?: string,
    body?: string,
    options: Partial<QRGenerationOptions> = {}
  ): Promise<QRCodeData> {
    const component = 'QRGenerationService.Email';
    debug.info(component, '📧 Generating email QR code', { email, hasSubject: !!subject, hasBody: !!body });

    try {
      // Validate email
      const emailValidation = TypeValidator.validateEmail(email);
      if (!emailValidation.isValid) {
        const error = new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
        debug.error(component, '❌ Email validation failed', error, { email });
        throw error;
      }

      let emailString = `mailto:${email}`;
      const params: string[] = [];

      if (subject) {
        params.push(`subject=${encodeURIComponent(subject)}`);
      }

      if (body) {
        params.push(`body=${encodeURIComponent(body)}`);
      }

      if (params.length > 0) {
        emailString += `?${params.join('&')}`;
      }

      debug.debug(component, '📬 Email string generated', { emailString, params: params.length });

      return this.generateQRCode(emailString, options, 'email');
    } catch (error) {
      debug.error(component, '💥 Email QR generation failed', error as Error, { email, subject, body });
      throw error;
    }
  }

  /**
   * Generate Phone QR code
   */
  public async generatePhoneQR(phone: string, options: Partial<QRGenerationOptions> = {}): Promise<QRCodeData> {
    const component = 'QRGenerationService.Phone';
    debug.info(component, '📞 Generating phone QR code', { phone });

    try {
      // Validate phone
      const phoneValidation = TypeValidator.validatePhone(phone);
      if (!phoneValidation.isValid) {
        const error = new Error(`Invalid phone: ${phoneValidation.errors.join(', ')}`);
        debug.error(component, '❌ Phone validation failed', error, { phone });
        throw error;
      }

      const phoneString = `tel:${phone.replace(/[^+\d]/g, '')}`;
      debug.debug(component, '☎️ Phone string generated', { phoneString });

      return this.generateQRCode(phoneString, options, 'phone');
    } catch (error) {
      debug.error(component, '💥 Phone QR generation failed', error as Error, { phone });
      throw error;
    }
  }

  /**
   * Generate SMS QR code
   */
  public async generateSMSQR(
    phone: string,
    message?: string,
    options: Partial<QRGenerationOptions> = {}
  ): Promise<QRCodeData> {
    const component = 'QRGenerationService.SMS';
    debug.info(component, '💬 Generating SMS QR code', { phone, hasMessage: !!message });

    try {
      // Validate phone
      const phoneValidation = TypeValidator.validatePhone(phone);
      if (!phoneValidation.isValid) {
        const error = new Error(`Invalid phone: ${phoneValidation.errors.join(', ')}`);
        debug.error(component, '❌ Phone validation failed', error, { phone });
        throw error;
      }

      let smsString = `sms:${phone.replace(/[^+\d]/g, '')}`;
      
      if (message) {
        smsString += `?body=${encodeURIComponent(message)}`;
      }

      debug.debug(component, '📱 SMS string generated', { smsString });

      return this.generateQRCode(smsString, options, 'sms');
    } catch (error) {
      debug.error(component, '💥 SMS QR generation failed', error as Error, { phone, message });
      throw error;
    }
  }

  /**
   * Generate test QR codes for debugging
   */
  public async generateTestQRCodes(): Promise<QRCodeData[]> {
    const component = 'QRGenerationService.Test';
    debug.info(component, '🧪 Generating test QR codes');

    try {
      const testResults: QRCodeData[] = [];

      // Generate basic test QR codes
      for (const testData of TEST_QR_DATA) {
        if (testData.text && testData.type) {
          debug.debug(component, `🔬 Generating test QR: ${testData.title}`, testData);
          const qrData = await this.generateQRCode(testData.text, {}, testData.type);
          testResults.push(qrData);
        }
      }

      // Generate WiFi test QR
      debug.debug(component, '🔬 Generating test WiFi QR', TEST_WIFI_DATA);
      const wifiQR = await this.generateWiFiQR(TEST_WIFI_DATA);
      testResults.push(wifiQR);

      // Generate Contact test QR
      debug.debug(component, '🔬 Generating test Contact QR', TEST_CONTACT_DATA);
      const contactQR = await this.generateContactQR(TEST_CONTACT_DATA);
      testResults.push(contactQR);

      // Generate Email test QR
      debug.debug(component, '🔬 Generating test Email QR');
      const emailQR = await this.generateEmailQR(
        'demo@qr-generator.com',
        'QR Test Email',
        'This is a test email generated by QR Super Generator'
      );
      testResults.push(emailQR);

      debug.info(component, '✅ Test QR codes generated successfully', {
        count: testResults.length,
        types: testResults.map(qr => qr.type)
      });

      return testResults;
    } catch (error) {
      debug.error(component, '💥 Test QR generation failed', error as Error);
      throw error;
    }
  }

  /**
   * Get generation statistics
   */
  public getStatistics() {
    return {
      totalGenerated: this.generationCount,
      averageGenerationTime: this.generationCount > 0 ? this.totalGenerationTime / this.generationCount : 0,
      totalGenerationTime: this.totalGenerationTime
    };
  }

  /**
   * Run initial tests to verify service functionality
   */
  private async runInitialTests(): Promise<void> {
    const component = 'QRGenerationService.InitTest';
    
    try {
      debug.info(component, '🧪 Running initial QR service tests');

      // Test basic QR generation
      const testQR = await this.generateQRCode('Test QR Code', { width: 128 }, 'text');
      
      if (!testQR.dataUrl.startsWith('data:image/')) {
        throw new Error('Initial test failed: Invalid data URL');
      }

      debug.info(component, '✅ Initial QR service tests passed', {
        testId: testQR.id,
        dataUrlLength: testQR.dataUrl.length
      });

    } catch (error) {
      debug.error(component, '❌ Initial QR service tests failed', error as Error);
    }
  }

  /**
   * Generate unique ID for QR codes
   */
  private generateId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate appropriate title for QR code
   */
  private generateTitle(text: string, type: QRCodeType): string {
    switch (type) {
      case 'url':
        try {
          return new URL(text).hostname;
        } catch {
          return 'URL QR Code';
        }
      case 'wifi':
        const ssidMatch = text.match(/S:(.*?);/);
        return ssidMatch ? `WiFi: ${ssidMatch[1]}` : 'WiFi QR Code';
      case 'email':
        const emailMatch = text.match(/mailto:([^?]+)/);
        return emailMatch ? `Email: ${emailMatch[1]}` : 'Email QR Code';
      case 'phone':
        return `Phone: ${text.replace('tel:', '')}`;
      case 'sms':
        const phoneMatch = text.match(/sms:([^?]+)/);
        return phoneMatch ? `SMS: ${phoneMatch[1]}` : 'SMS QR Code';
      case 'contact':
        const nameMatch = text.match(/FN:(.*?)[\n\r]/);
        return nameMatch ? `Contact: ${nameMatch[1]}` : 'Contact QR Code';
      case 'calendar':
        const eventMatch = text.match(/SUMMARY:(.*?)[\n\r]/);
        return eventMatch ? `Event: ${eventMatch[1]}` : 'Calendar QR Code';
      default:
        return text.length > 50 ? `${text.substring(0, 47)}...` : text;
    }
  }
}

// Export singleton instance
export const qrService = QRGenerationService.getInstance();

// Export for testing and debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.qrService = qrService;
  // @ts-ignore
  window.generateTestQRs = () => qrService.generateTestQRCodes();
}

export default qrService;