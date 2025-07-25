/**
 * QR Super Generator - Advanced Export Management System
 * 
 * Handles bulk exports, ZIP generation, multiple formats,
 * and optimized file handling for large datasets
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeData, QRCodeType } from '../types';
import analytics from './analytics';

export interface ExportOptions {
  format: 'zip' | 'json' | 'csv' | 'pdf' | 'html';
  includeMetadata: boolean;
  compression: 'none' | 'fast' | 'best';
  naming: 'sequential' | 'timestamp' | 'custom';
  customNaming?: (qr: QRCodeData, index: number) => string;
  watermark?: string;
  branding?: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ExportProgress {
  current: number;
  total: number;
  stage: 'preparing' | 'processing' | 'compressing' | 'downloading';
  filename?: string;
  estimatedTime: number;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize: number;
  itemCount: number;
  duration: number;
  error?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  options: ExportOptions;
  isDefault: boolean;
  createdAt: number;
}

class ExportManager {
  private static instance: ExportManager;
  private activeExports: Map<string, AbortController> = new Map();
  private templates: Map<string, ExportTemplate> = new Map();
  
  private defaultOptions: ExportOptions = {
    format: 'zip',
    includeMetadata: true,
    compression: 'fast',
    naming: 'timestamp',
    quality: 'high',
    branding: true
  };

  private constructor() {
    this.initializeExportManager();
  }

  public static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  private async initializeExportManager() {
    try {
      await this.loadExportTemplates();
      await this.createDefaultTemplates();
    } catch (error) {
      console.error('Failed to initialize export manager:', error);
    }
  }

  // Main export methods
  public async exportQRCodes(
    qrCodes: QRCodeData[],
    options: Partial<ExportOptions> = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const exportId = this.generateExportId();
    const controller = new AbortController();
    this.activeExports.set(exportId, controller);

    const finalOptions: ExportOptions = { ...this.defaultOptions, ...options };
    const startTime = performance.now();

    try {
      analytics.trackEvent('export', 'start', {
        format: finalOptions.format,
        itemCount: qrCodes.length,
        options: finalOptions
      });

      onProgress?.({
        current: 0,
        total: qrCodes.length,
        stage: 'preparing',
        estimatedTime: this.estimateExportTime(qrCodes.length, finalOptions.format)
      });

      let result: ExportResult;

      switch (finalOptions.format) {
        case 'zip':
          result = await this.exportAsZip(qrCodes, finalOptions, onProgress, controller.signal);
          break;
        case 'json':
          result = await this.exportAsJSON(qrCodes, finalOptions);
          break;
        case 'csv':
          result = await this.exportAsCSV(qrCodes, finalOptions);
          break;
        case 'pdf':
          result = await this.exportAsPDF(qrCodes, finalOptions, onProgress, controller.signal);
          break;
        case 'html':
          result = await this.exportAsHTML(qrCodes, finalOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${finalOptions.format}`);
      }

      const duration = performance.now() - startTime;
      result.duration = duration;

      analytics.trackEvent('export', 'complete', {
        format: finalOptions.format,
        itemCount: qrCodes.length,
        fileSize: result.fileSize,
        duration
      });

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      analytics.trackError(error as Error, 'export_manager');
      
      return {
        success: false,
        filename: '',
        fileSize: 0,
        itemCount: qrCodes.length,
        duration,
        error: (error as Error).message
      };
    } finally {
      this.activeExports.delete(exportId);
    }
  }

  // ZIP Export
  private async exportAsZip(
    qrCodes: QRCodeData[],
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void,
    signal?: AbortSignal
  ): Promise<ExportResult> {
    const zip = new JSZip();
    const filename = this.generateFilename('qr-codes', 'zip');

    // Create folder structure
    const imagesFolder = zip.folder('images');
    const dataFolder = zip.folder('data');

    onProgress?.({
      current: 0,
      total: qrCodes.length,
      stage: 'processing',
      filename,
      estimatedTime: qrCodes.length * 50 // Rough estimate
    });

    // Process QR codes
    for (let i = 0; i < qrCodes.length; i++) {
      if (signal?.aborted) throw new Error('Export cancelled');

      const qr = qrCodes[i];
      const qrFilename = this.generateQRFilename(qr, i, options.naming, options.customNaming);

      // Add QR image
      const imageData = await this.getImageDataFromDataUrl(qr.dataUrl);
      imagesFolder?.file(`${qrFilename}.png`, imageData);

      // Add metadata if requested
      if (options.includeMetadata) {
        const metadata = this.generateQRMetadata(qr);
        dataFolder?.file(`${qrFilename}.json`, JSON.stringify(metadata, null, 2));
      }

      onProgress?.({
        current: i + 1,
        total: qrCodes.length,
        stage: 'processing',
        filename,
        estimatedTime: (qrCodes.length - i - 1) * 50
      });
    }

    // Add summary files
    if (options.includeMetadata) {
      const summary = this.generateExportSummary(qrCodes, options);
      zip.file('summary.json', JSON.stringify(summary, null, 2));
      
      const csvData = this.generateCSVData(qrCodes);
      zip.file('summary.csv', csvData);
    }

    // Add README
    const readme = this.generateReadme(qrCodes, options);
    zip.file('README.txt', readme);

    onProgress?.({
      current: qrCodes.length,
      total: qrCodes.length,
      stage: 'compressing',
      filename,
      estimatedTime: 2000
    });

    // Generate ZIP with compression
    const compressionLevel = this.getCompressionLevel(options.compression);
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: compressionLevel }
    });

    onProgress?.({
      current: qrCodes.length,
      total: qrCodes.length,
      stage: 'downloading',
      filename,
      estimatedTime: 500
    });

    // Download file
    saveAs(zipBlob, filename);

    return {
      success: true,
      filename,
      fileSize: zipBlob.size,
      itemCount: qrCodes.length,
      duration: 0 // Will be set by caller
    };
  }

  // JSON Export
  private async exportAsJSON(qrCodes: QRCodeData[], options: ExportOptions): Promise<ExportResult> {
    const filename = this.generateFilename('qr-data', 'json');
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        count: qrCodes.length,
        options: options
      },
      qrCodes: qrCodes.map((qr, index) => ({
        index,
        ...qr,
        ...(options.includeMetadata ? this.generateQRMetadata(qr) : {})
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    saveAs(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      itemCount: qrCodes.length,
      duration: 0
    };
  }

  // CSV Export
  private async exportAsCSV(qrCodes: QRCodeData[], options: ExportOptions): Promise<ExportResult> {
    const filename = this.generateFilename('qr-data', 'csv');
    const csvData = this.generateCSVData(qrCodes, options.includeMetadata);
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    saveAs(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      itemCount: qrCodes.length,
      duration: 0
    };
  }

  // PDF Export
  private async exportAsPDF(
    qrCodes: QRCodeData[],
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void,
    signal?: AbortSignal
  ): Promise<ExportResult> {
    // Note: This would require a PDF library like jsPDF
    // For now, we'll create a simple HTML version and let the browser handle PDF conversion
    const filename = this.generateFilename('qr-codes', 'pdf');
    
    onProgress?.({
      current: 0,
      total: qrCodes.length,
      stage: 'processing',
      filename,
      estimatedTime: qrCodes.length * 100
    });

    const htmlContent = this.generatePDFHTML(qrCodes, options);
    
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }

    return {
      success: true,
      filename,
      fileSize: htmlContent.length,
      itemCount: qrCodes.length,
      duration: 0
    };
  }

  // HTML Export
  private async exportAsHTML(qrCodes: QRCodeData[], options: ExportOptions): Promise<ExportResult> {
    const filename = this.generateFilename('qr-gallery', 'html');
    const htmlContent = this.generateGalleryHTML(qrCodes, options);
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    saveAs(blob, filename);

    return {
      success: true,
      filename,
      fileSize: blob.size,
      itemCount: qrCodes.length,
      duration: 0
    };
  }

  // Template management
  public async saveExportTemplate(name: string, description: string, options: ExportOptions): Promise<string> {
    const templateId = this.generateTemplateId();
    
    const template: ExportTemplate = {
      id: templateId,
      name,
      description,
      options,
      isDefault: false,
      createdAt: Date.now()
    };

    this.templates.set(templateId, template);
    await this.persistTemplates();

    analytics.trackEvent('export', 'template_created', { templateId, name });

    return templateId;
  }

  public getExportTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getExportTemplate(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }

  public async deleteExportTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template || template.isDefault) {
      throw new Error('Cannot delete default template');
    }

    this.templates.delete(id);
    await this.persistTemplates();

    analytics.trackEvent('export', 'template_deleted', { templateId: id });
  }

  // Utility methods
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    return `${prefix}_${timestamp}_${Date.now()}.${extension}`;
  }

  private generateQRFilename(
    qr: QRCodeData,
    index: number,
    naming: string,
    customNaming?: (qr: QRCodeData, index: number) => string
  ): string {
    if (customNaming) {
      return this.sanitizeFilename(customNaming(qr, index));
    }

    switch (naming) {
      case 'sequential':
        return `qr_${(index + 1).toString().padStart(4, '0')}`;
      case 'timestamp':
        return `qr_${qr.timestamp.replace(/[:.]/g, '-')}`;
      default:
        return `qr_${qr.id}`;
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
  }

  private async getImageDataFromDataUrl(dataUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(dataUrl);
    return response.arrayBuffer();
  }

  private generateQRMetadata(qr: QRCodeData) {
    return {
      id: qr.id,
      type: qr.type,
      title: qr.title,
      text: qr.text,
      timestamp: qr.timestamp,
      metadata: qr.metadata,
      size: {
        width: qr.metadata?.size || 256,
        height: qr.metadata?.size || 256
      },
      colors: qr.metadata?.color || { dark: '#000000', light: '#FFFFFF' }
    };
  }

  private generateExportSummary(qrCodes: QRCodeData[], options: ExportOptions) {
    const typeDistribution: Record<string, number> = {};
    
    qrCodes.forEach(qr => {
      typeDistribution[qr.type] = (typeDistribution[qr.type] || 0) + 1;
    });

    return {
      exportedAt: new Date().toISOString(),
      totalCodes: qrCodes.length,
      typeDistribution,
      options,
      dateRange: {
        earliest: qrCodes.reduce((min, qr) => qr.timestamp < min ? qr.timestamp : min, qrCodes[0]?.timestamp),
        latest: qrCodes.reduce((max, qr) => qr.timestamp > max ? qr.timestamp : max, qrCodes[0]?.timestamp)
      }
    };
  }

  private generateCSVData(qrCodes: QRCodeData[], includeMetadata: boolean = true): string {
    const headers = ['Index', 'ID', 'Type', 'Title', 'Text', 'Timestamp'];
    
    if (includeMetadata) {
      headers.push('Size', 'Error Level', 'Colors');
    }

    const rows = qrCodes.map((qr, index) => {
      const row = [
        index + 1,
        qr.id,
        qr.type,
        `"${qr.title.replace(/"/g, '""')}"`,
        `"${qr.text.replace(/"/g, '""')}"`,
        qr.timestamp
      ];

      if (includeMetadata) {
        row.push(
          qr.metadata?.size || '256',
          qr.metadata?.errorLevel || 'M',
          JSON.stringify(qr.metadata?.color || {}).replace(/"/g, '""')
        );
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private generateReadme(qrCodes: QRCodeData[], options: ExportOptions): string {
    return `QR Super Generator - Export Package
=====================================

Export Date: ${new Date().toISOString()}
Total QR Codes: ${qrCodes.length}
Format: ${options.format.toUpperCase()}

Contents:
- images/ - QR code PNG files
- data/ - Metadata JSON files (if enabled)
- summary.json - Export summary and statistics
- summary.csv - QR codes data in CSV format
- README.txt - This file

QR Code Types:
${Object.entries(qrCodes.reduce((acc, qr) => {
  acc[qr.type] = (acc[qr.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>)).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Generated by QR Super Generator
https://chrome.google.com/webstore/detail/qr-super-generator
`;
  }

  private generatePDFHTML(qrCodes: QRCodeData[], options: ExportOptions): string {
    const qrGrid = qrCodes.map((qr, index) => `
      <div class="qr-item">
        <img src="${qr.dataUrl}" alt="QR Code ${index + 1}" />
        <div class="qr-info">
          <h3>${qr.title}</h3>
          <p>${qr.text.substring(0, 100)}${qr.text.length > 100 ? '...' : ''}</p>
          <small>Type: ${qr.type} | Generated: ${new Date(qr.timestamp).toLocaleDateString()}</small>
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>QR Codes Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .qr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .qr-item { border: 1px solid #ddd; padding: 15px; text-align: center; page-break-inside: avoid; }
    .qr-item img { max-width: 150px; height: auto; }
    .qr-info { margin-top: 10px; }
    .qr-info h3 { margin: 5px 0; font-size: 14px; }
    .qr-info p { margin: 5px 0; font-size: 12px; word-break: break-all; }
    .qr-info small { color: #666; font-size: 10px; }
    @media print { .qr-item { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>QR Codes Export</h1>
    <p>Total: ${qrCodes.length} QR codes | Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="qr-grid">${qrGrid}</div>
</body>
</html>`;
  }

  private generateGalleryHTML(qrCodes: QRCodeData[], options: ExportOptions): string {
    const qrGrid = qrCodes.map((qr, index) => `
      <div class="qr-card">
        <div class="qr-image">
          <img src="${qr.dataUrl}" alt="QR Code ${index + 1}" />
          <div class="qr-overlay">
            <button onclick="downloadQR('${qr.dataUrl}', '${qr.id}')">Download</button>
          </div>
        </div>
        <div class="qr-details">
          <h3>${qr.title}</h3>
          <p class="qr-text">${qr.text}</p>
          <div class="qr-meta">
            <span class="qr-type">${qr.type}</span>
            <span class="qr-date">${new Date(qr.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>QR Codes Gallery</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .qr-card { background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.2s; }
    .qr-card:hover { transform: translateY(-2px); }
    .qr-image { position: relative; text-align: center; padding: 20px; }
    .qr-image img { width: 200px; height: 200px; border-radius: 8px; }
    .qr-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
    .qr-image:hover .qr-overlay { opacity: 1; }
    .qr-overlay button { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
    .qr-details { padding: 20px; }
    .qr-details h3 { font-size: 16px; margin-bottom: 8px; color: #333; }
    .qr-text { font-size: 14px; color: #666; margin-bottom: 12px; word-break: break-all; }
    .qr-meta { display: flex; justify-content: space-between; }
    .qr-type { background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .qr-date { font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>QR Codes Gallery</h1>
    <p>Total: ${qrCodes.length} QR codes | Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="container">
    <div class="qr-grid">${qrGrid}</div>
  </div>
  <script>
    function downloadQR(dataUrl, id) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = \`qr_\${id}.png\`;
      link.click();
    }
  </script>
</body>
</html>`;
  }

  private getCompressionLevel(compression: string): number {
    switch (compression) {
      case 'none': return 0;
      case 'fast': return 3;
      case 'best': return 9;
      default: return 6;
    }
  }

  private estimateExportTime(count: number, format: string): number {
    const baseTime = {
      zip: 100,
      json: 10,
      csv: 5,
      pdf: 200,
      html: 20
    };

    return (baseTime[format as keyof typeof baseTime] || 50) * count;
  }

  private async loadExportTemplates(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['exportTemplates']);
      const templates = result.exportTemplates || {};
      
      Object.values(templates).forEach((template: any) => {
        this.templates.set(template.id, template);
      });
    } catch (error) {
      console.error('Failed to load export templates:', error);
    }
  }

  private async persistTemplates(): Promise<void> {
    try {
      const templates: Record<string, ExportTemplate> = {};
      this.templates.forEach((template, id) => {
        templates[id] = template;
      });
      
      await chrome.storage.local.set({ exportTemplates: templates });
    } catch (error) {
      console.error('Failed to persist export templates:', error);
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    if (this.templates.size > 0) return;

    const defaultTemplates: Array<Omit<ExportTemplate, 'id' | 'createdAt'>> = [
      {
        name: 'Quick ZIP',
        description: 'Fast ZIP export with images only',
        options: {
          format: 'zip',
          includeMetadata: false,
          compression: 'fast',
          naming: 'sequential',
          quality: 'medium',
          branding: false
        },
        isDefault: true
      },
      {
        name: 'Complete Archive',
        description: 'Full ZIP export with all metadata',
        options: {
          format: 'zip',
          includeMetadata: true,
          compression: 'best',
          naming: 'timestamp',
          quality: 'high',
          branding: true
        },
        isDefault: true
      },
      {
        name: 'Data Export',
        description: 'JSON export for data analysis',
        options: {
          format: 'json',
          includeMetadata: true,
          compression: 'none',
          naming: 'timestamp',
          quality: 'high',
          branding: false
        },
        isDefault: true
      }
    ];

    for (const template of defaultTemplates) {
      const id = this.generateTemplateId();
      this.templates.set(id, {
        ...template,
        id,
        createdAt: Date.now()
      });
    }

    await this.persistTemplates();
  }

  // Cancel active export
  public cancelExport(exportId: string): boolean {
    const controller = this.activeExports.get(exportId);
    if (controller) {
      controller.abort();
      this.activeExports.delete(exportId);
      analytics.trackEvent('export', 'cancelled', { exportId });
      return true;
    }
    return false;
  }

  // Get active exports
  public getActiveExports(): string[] {
    return Array.from(this.activeExports.keys());
  }
}

// Export singleton instance
export const exportManager = ExportManager.getInstance();
export default exportManager; 