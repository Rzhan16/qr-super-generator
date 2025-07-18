import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QrCode, Download, Copy, Palette, Settings, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { generateQRCode, validateQRText, getOptimalSize, QROptions } from '../../utils/qr-generator';
import { downloadFile } from '../../utils/chrome-apis';
import { addToQRHistory, trackQRGeneration, trackDownload, addRecentColor } from '../../utils/storage';
import { QRCodeData } from '../../types';

interface QRGeneratorProps {
  initialText?: string;
  initialType?: 'url' | 'text' | 'custom';
  onQRGenerated?: (qrData: QRCodeData) => void;
  className?: string;
}

type QRType = 'url' | 'text' | 'custom';

const QRGenerator: React.FC<QRGeneratorProps> = ({
  initialText = '',
  initialType = 'text',
  onQRGenerated,
  className = ''
}) => {
  // State management
  const [text, setText] = useState(initialText);
  const [qrType, setQrType] = useState<QRType>(initialType);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCustomization, setShowCustomization] = useState(false);
  const [previewMode, setPreviewMode] = useState<'live' | 'manual'>('live');
  
  // QR Options State
  const [qrOptions, setQrOptions] = useState<QROptions>({
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png'
  });

  // Validation and sizing
  const validation = useMemo(() => validateQRText(text), [text]);
  const optimalSize = useMemo(() => getOptimalSize(text), [text]);
  
  // Real-time QR generation
  const generateQR = useCallback(async (inputText?: string, options?: QROptions): Promise<void> => {
    const qrText = inputText || text;
    const qrOpts = options || qrOptions;
    
    if (!qrText.trim()) {
      setQrDataUrl('');
      setError('');
      return;
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid input');
      setQrDataUrl('');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const dataUrl = await generateQRCode(qrText, qrOpts);
      setQrDataUrl(dataUrl);
      
      // Create QR data object
      const qrData: QRCodeData = {
        id: Date.now(),
        text: qrText,
        dataUrl,
        timestamp: new Date().toISOString(),
        title: qrType === 'url' ? 'URL QR Code' : qrType === 'text' ? 'Text QR Code' : 'Custom QR Code',
        type: qrType,
        metadata: {
          size: qrOpts.width || 256,
          errorLevel: qrOpts.errorCorrectionLevel || 'M',
          color: {
            dark: qrOpts.color?.dark || '#000000',
            light: qrOpts.color?.light || '#FFFFFF'
          }
        }
      };

      // Save to history and track analytics
      await addToQRHistory(qrData);
      await trackQRGeneration(qrType, qrOpts.width || 256);
      
      // Notify parent component
      onQRGenerated?.(qrData);
      
    } catch (err) {
      console.error('QR generation failed:', err);
      setError('Failed to generate QR code. Please try again.');
      setQrDataUrl('');
    } finally {
      setIsGenerating(false);
    }
  }, [text, qrOptions, validation, qrType, onQRGenerated]);

  // Live preview effect
  useEffect(() => {
    if (previewMode === 'live' && text.trim() && validation.isValid) {
      const timeoutId = setTimeout(() => {
        generateQR();
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [text, qrOptions, previewMode, validation.isValid, generateQR]);

  // Handle manual generation
  const handleManualGenerate = () => {
    if (previewMode === 'manual') {
      generateQR();
    }
  };

  // Download QR code
  const handleDownload = async () => {
    if (!qrDataUrl) return;
    
    try {
      const filename = `qr-${qrType}-${Date.now()}.png`;
      await downloadFile(qrDataUrl, filename);
      await trackDownload();
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download QR code');
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!qrDataUrl) return;
    
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      // Show success feedback
      setError('');
      // You could add a toast notification here
      
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback: copy the text instead
      try {
        await navigator.clipboard.writeText(text);
      } catch (fallbackErr) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  // Update QR options
  const updateQROptions = (updates: Partial<QROptions>) => {
    setQrOptions(prev => ({ ...prev, ...updates }));
    
    // Add color to recent colors if it's a color update
    if (updates.color?.dark) {
      addRecentColor(updates.color.dark);
    }
    if (updates.color?.light) {
      addRecentColor(updates.color.light);
    }
  };

  // Reset to defaults
  const resetOptions = () => {
    setQrOptions({
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      type: 'image/png'
    });
  };

  // Suggest optimal size
  const applyOptimalSize = () => {
    updateQROptions({ width: optimalSize });
  };

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">QR Generator</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(prev => prev === 'live' ? 'manual' : 'live')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title={previewMode === 'live' ? 'Switch to manual mode' : 'Switch to live mode'}
          >
            {previewMode === 'live' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Customize QR code"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QR Type Selector */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {(['url', 'text', 'custom'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setQrType(type)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              qrType === type
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {qrType === 'url' ? 'URL' : qrType === 'text' ? 'Text' : 'Custom Content'}
          </label>
          
          {text.length > 0 && (
            <span className={`text-xs ${
              validation.isValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {text.length}/4296 chars
            </span>
          )}
        </div>
        
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              qrType === 'url' 
                ? 'https://example.com' 
                : qrType === 'text'
                ? 'Enter your text here...'
                : 'Enter any content (URL, text, etc.)'
            }
            className={`w-full px-3 py-2 border rounded-lg resize-none h-20 text-sm ${
              error 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } focus:outline-none focus:ring-2`}
          />
          
          {text && (
            <button
              onClick={() => setText('')}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
              title="Clear text"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        {!validation.isValid && validation.error && (
          <p className="text-sm text-red-600">{validation.error}</p>
        )}
      </div>

      {/* Customization Panel */}
      {showCustomization && (
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Customization</h4>
            <button
              onClick={resetOptions}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Reset
            </button>
          </div>
          
          {/* Size Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size (px)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={qrOptions.width || 256}
                  onChange={(e) => updateQROptions({ width: parseInt(e.target.value) || 256 })}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="128"
                  max="1024"
                  step="32"
                />
                {optimalSize !== (qrOptions.width || 256) && (
                  <button
                    onClick={applyOptimalSize}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    title={`Optimal: ${optimalSize}px`}
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margin
              </label>
              <input
                type="number"
                value={qrOptions.margin || 1}
                onChange={(e) => updateQROptions({ margin: parseInt(e.target.value) || 1 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                min="0"
                max="10"
              />
            </div>
          </div>
          
          {/* Color Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foreground
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={qrOptions.color?.dark || '#000000'}
                  onChange={(e) => updateQROptions({ 
                    color: { ...qrOptions.color, dark: e.target.value }
                  })}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={qrOptions.color?.dark || '#000000'}
                  onChange={(e) => updateQROptions({ 
                    color: { ...qrOptions.color, dark: e.target.value }
                  })}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={qrOptions.color?.light || '#FFFFFF'}
                  onChange={(e) => updateQROptions({ 
                    color: { ...qrOptions.color, light: e.target.value }
                  })}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={qrOptions.color?.light || '#FFFFFF'}
                  onChange={(e) => updateQROptions({ 
                    color: { ...qrOptions.color, light: e.target.value }
                  })}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>
          
          {/* Error Correction Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Error Correction
            </label>
            <select
              value={qrOptions.errorCorrectionLevel || 'M'}
              onChange={(e) => updateQROptions({ 
                errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' 
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%)</option>
            </select>
          </div>
        </div>
      )}

      {/* Manual Generate Button */}
      {previewMode === 'manual' && (
        <button
          onClick={handleManualGenerate}
          disabled={!text.trim() || !validation.isValid || isGenerating}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isGenerating ? 'Generating...' : 'Generate QR Code'}
        </button>
      )}

      {/* QR Preview */}
      {qrDataUrl && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
            <div className="bg-white p-2 rounded shadow-sm">
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="block"
                style={{ 
                  width: Math.min(qrOptions.width || 256, 200),
                  height: Math.min(qrOptions.width || 256, 200)
                }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
          
          {/* QR Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{qrOptions.width || 256}px</span>
            </div>
            <div className="flex justify-between">
              <span>Error Level:</span>
              <span>{qrOptions.errorCorrectionLevel || 'M'}</span>
            </div>
            <div className="flex justify-between">
              <span>Data Length:</span>
              <span>{text.length} chars</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isGenerating && !qrDataUrl && (
        <div className="bg-gray-50 rounded-lg p-8 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-600">Generating QR code...</p>
        </div>
      )}
      
      {/* Empty State */}
      {!text.trim() && !isGenerating && !qrDataUrl && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Enter {qrType === 'url' ? 'a URL' : qrType === 'text' ? 'text' : 'content'} to generate QR code
          </p>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;