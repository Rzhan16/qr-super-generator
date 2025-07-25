/**
 * QR Super Generator - Main QR Code Generator Component
 * 
 * Advanced QR code generator with real-time preview, customization,
 * and comprehensive type support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, Palette, Settings, Download, Copy, RefreshCw, Eye } from 'lucide-react';
import { debug } from '../utils/debug';
import { qrService } from '../utils/qr-service';
import { storageService } from '../utils/storage-service';
import chromeAPIs from '../utils/chrome-apis';
import { QRCodeData, QRCodeType, QRGenerationOptions, ErrorCorrectionLevel, TypeValidator } from '../types';

interface QRGeneratorProps {
  onQRGenerated?: (qrData: QRCodeData) => void;
  onError?: (error: string) => void;
  initialText?: string;
  initialType?: QRCodeType;
}

interface QRFormState {
  text: string;
  type: QRCodeType;
  options: QRGenerationOptions;
}

interface CustomizationOptions {
  size: number;
  errorCorrection: ErrorCorrectionLevel;
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
}

export default function QRGenerator({ onQRGenerated, onError, initialText = '', initialType = 'text' }: QRGeneratorProps) {
  const [formState, setFormState] = useState<QRFormState>({
    text: initialText,
    type: initialType,
    options: {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#9333ea',
        light: '#ffffff'
      }
    }
  });

  const [customization, setCustomization] = useState<CustomizationOptions>({
    size: 256,
    errorCorrection: 'M',
    foregroundColor: '#9333ea',
    backgroundColor: '#ffffff',
    margin: 1
  });

  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [livePreview, setLivePreview] = useState(true);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const component = 'QRGenerator';

  useEffect(() => {
    debug.info(component, '🎯 QR Generator initialized', { initialText, initialType });
    
    // Load current tab URL if no initial text
    if (!initialText) {
      loadCurrentTabURL();
    }
    
    // Generate initial QR if text is provided
    if (initialText && livePreview) {
      generateQR();
    }
  }, []);

  useEffect(() => {
    // Update options when customization changes
    setFormState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        width: customization.size,
        margin: customization.margin,
        errorCorrectionLevel: customization.errorCorrection,
        color: {
          dark: customization.foregroundColor,
          light: customization.backgroundColor
        }
      }
    }));
  }, [customization]);

  useEffect(() => {
    // Live preview with debouncing
    if (livePreview && formState.text.trim()) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      const timer = setTimeout(() => {
        generateQR();
      }, 500); // 500ms debounce
      
      setDebounceTimer(timer);
      
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [formState.text, formState.type, formState.options, livePreview]);

  const loadCurrentTabURL = async () => {
    try {
      const currentTab = await chromeAPIs.getCurrentTab();
      if (currentTab?.url && (currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://'))) {
        setFormState(prev => ({
          ...prev,
          text: currentTab.url,
          type: 'url'
        }));
        debug.info(component, '✅ Loaded current tab URL', { url: currentTab.url });
      }
    } catch (error) {
      debug.warn(component, '⚠️ Could not load current tab URL', error as Error);
    }
  };

  const validateInput = useCallback((): boolean => {
    setError(null);
    
    if (!formState.text.trim()) {
      setError('Please enter text for the QR code');
      return false;
    }

    const validation = TypeValidator.validateQRText(formState.text);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return false;
    }

    // Additional type-specific validation
    switch (formState.type) {
      case 'url':
        const urlValidation = TypeValidator.validateURL(formState.text);
        if (!urlValidation.isValid) {
          setError('Please enter a valid URL');
          return false;
        }
        break;
      case 'email':
        if (!formState.text.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
      case 'phone':
        const phoneValidation = TypeValidator.validatePhone(formState.text);
        if (!phoneValidation.isValid) {
          setError('Please enter a valid phone number');
          return false;
        }
        break;
    }

    return true;
  }, [formState.text, formState.type]);

  const generateQR = useCallback(async () => {
    if (!validateInput()) {
      return;
    }

    setIsGenerating(true);

    try {
      debug.startPerformance('qr-generation-main', component);
      debug.info(component, '🎯 Generating QR code', {
        text: formState.text.substring(0, 50) + '...',
        type: formState.type,
        options: formState.options
      });

      const qrData = await qrService.generateQRCode(
        formState.text,
        formState.options,
        formState.type
      );

      debug.endPerformance('qr-generation-main', component);

      setGeneratedQR(qrData);
      await storageService.addToHistory(qrData);

      if (onQRGenerated) {
        onQRGenerated(qrData);
      }

      debug.info(component, '✅ QR code generated successfully', {
        id: qrData.id,
        type: qrData.type
      });

    } catch (error) {
      debug.endPerformance('qr-generation-main', component);
      debug.error(component, '❌ QR generation failed', error as Error);
      
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [formState, validateInput, onQRGenerated, onError]);

  const handleInputChange = (field: keyof QRFormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleCustomizationChange = (field: keyof CustomizationOptions, value: any) => {
    setCustomization(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyQR = async () => {
    if (!generatedQR) return;
    
    debug.trackUserAction(component, 'copy-qr', 'copy-button');
    
    try {
      const success = await chromeAPIs.copyImageToClipboard(generatedQR.dataUrl);
      if (success) {
        debug.info(component, '✅ QR code copied to clipboard');
      } else {
        // Fallback to copying text
        await chromeAPIs.copyToClipboard(generatedQR.text);
        debug.info(component, '✅ QR text copied to clipboard (fallback)');
      }
    } catch (error) {
      debug.error(component, '❌ Failed to copy QR code', error as Error);
    }
  };

  const handleDownloadQR = async () => {
    if (!generatedQR) return;
    
    debug.trackUserAction(component, 'download-qr', 'download-button');
    
    try {
      const filename = `qr-${generatedQR.type}-${Date.now()}.png`;
      const success = await chromeAPIs.downloadFile(generatedQR.dataUrl, filename);
      
      if (success) {
        debug.info(component, '✅ QR code download initiated', { filename });
      }
    } catch (error) {
      debug.error(component, '❌ Failed to download QR code', error as Error);
    }
  };

  const getPlaceholderText = () => {
    switch (formState.type) {
      case 'url': return 'https://example.com';
      case 'email': return 'your.email@example.com';
      case 'phone': return '+1-555-123-4567';
      case 'sms': return '+1-555-123-4567';
      case 'text': return 'Enter your text here...';
      default: return 'Enter content...';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">QR Code Generator</h2>
            <p className="text-gray-300 text-sm">Create customized QR codes with real-time preview</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLivePreview(!livePreview)}
            className={`p-2 rounded-lg transition-colors ${
              livePreview ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-400'
            }`}
            title="Toggle live preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className={`p-2 rounded-lg transition-colors ${
              showCustomization ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
            }`}
            title="Customization options"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <div className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">QR Code Type</label>
            <select
              value={formState.type}
              onChange={(e) => handleInputChange('type', e.target.value as QRCodeType)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="text">Text</option>
              <option value="url">URL/Website</option>
              <option value="email">Email</option>
              <option value="phone">Phone Number</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          {/* Content Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">Content</label>
              <span className="text-xs text-gray-400">
                {formState.text.length}/4296 characters
              </span>
            </div>
            <textarea
              value={formState.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              placeholder={getPlaceholderText()}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 h-24 resize-none"
              maxLength={4296}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          {!livePreview && (
            <button
              onClick={generateQR}
              disabled={isGenerating || !formState.text.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 px-4 rounded-lg transition-colors font-medium text-white flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Generate QR Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Customization Panel */}
      {showCustomization && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h3 className="font-medium mb-4 text-white flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Customization Options
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Size */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Size</label>
              <select
                value={customization.size}
                onChange={(e) => handleCustomizationChange('size', parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value={128}>128x128</option>
                <option value={256}>256x256</option>
                <option value={512}>512x512</option>
                <option value={1024}>1024x1024</option>
              </select>
            </div>

            {/* Error Correction */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Error Correction</label>
              <select
                value={customization.errorCorrection}
                onChange={(e) => handleCustomizationChange('errorCorrection', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </div>

            {/* Foreground Color */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Foreground Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={customization.foregroundColor}
                  onChange={(e) => handleCustomizationChange('foregroundColor', e.target.value)}
                  className="w-8 h-8 rounded border border-white/20"
                />
                <input
                  type="text"
                  value={customization.foregroundColor}
                  onChange={(e) => handleCustomizationChange('foregroundColor', e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                />
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Background Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={customization.backgroundColor}
                  onChange={(e) => handleCustomizationChange('backgroundColor', e.target.value)}
                  className="w-8 h-8 rounded border border-white/20"
                />
                <input
                  type="text"
                  value={customization.backgroundColor}
                  onChange={(e) => handleCustomizationChange('backgroundColor', e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Margin */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2 text-white">
              Margin: {customization.margin}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={customization.margin}
              onChange={(e) => handleCustomizationChange('margin', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Generated QR Display */}
      {generatedQR && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
          <h4 className="font-medium mb-3 text-white">{generatedQR.title}</h4>
          
          <div className="bg-white rounded-lg p-4 inline-block mb-4">
            <img 
              src={generatedQR.dataUrl} 
              alt="Generated QR Code" 
              className="w-48 h-48"
            />
          </div>
          
          <div className="text-sm text-gray-300 mb-4">
            <p>Type: <span className="font-medium text-white">{generatedQR.type}</span></p>
            <p>Size: <span className="font-medium text-white">{customization.size}x{customization.size}</span></p>
            <p>Created: <span className="font-medium text-white">{new Date(generatedQR.timestamp).toLocaleTimeString()}</span></p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleCopyQR}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-white"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <button
              onClick={handleDownloadQR}
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-white"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Status */}
      {livePreview && (
        <div className="text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>Live preview enabled - QR codes generate automatically</span>
          </p>
        </div>
      )}
    </div>
  );
} 