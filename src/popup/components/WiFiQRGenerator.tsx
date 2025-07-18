import React, { useState, useCallback } from 'react';
import { Wifi, Download, Copy, Eye, EyeOff, Shield, QrCode } from 'lucide-react';
import { generateWiFiQR, QROptions, WiFiQRData } from '../../utils/qr-generator';
import { downloadFile } from '../../utils/chrome-apis';
import { addToQRHistory, trackQRGeneration, trackDownload } from '../../utils/storage';
import { QRCodeData } from '../../types';

interface WiFiQRGeneratorProps {
  onQRGenerated?: (qrData: QRCodeData) => void;
  className?: string;
}

const WiFiQRGenerator: React.FC<WiFiQRGeneratorProps> = ({
  onQRGenerated,
  className = ''
}) => {
  // WiFi form state
  const [wifiData, setWifiData] = useState<WiFiQRData>({
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false
  });

  // Component state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [qrOptions] = useState<QROptions>({
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png'
  });

  // Validation
  const isValid = wifiData.ssid.trim().length > 0;
  const requiresPassword = wifiData.security !== 'nopass';

  // Generate WiFi QR code
  const generateQR = useCallback(async () => {
    if (!isValid) {
      setError('Network name (SSID) is required');
      return;
    }

    if (requiresPassword && !wifiData.password.trim()) {
      setError('Password is required for secured networks');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const dataUrl = await generateWiFiQR(wifiData, qrOptions);
      setQrDataUrl(dataUrl);
      
      // Create QR data object
      const qrData: QRCodeData = {
        id: Date.now(),
        text: `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password};H:${wifiData.hidden ? 'true' : 'false'};;`,
        dataUrl,
        timestamp: new Date().toISOString(),
        title: `WiFi: ${wifiData.ssid}`,
        type: 'wifi',
        metadata: {
          size: qrOptions.width || 256,
          errorLevel: qrOptions.errorCorrectionLevel || 'M',
          color: {
            dark: qrOptions.color?.dark || '#000000',
            light: qrOptions.color?.light || '#FFFFFF'
          }
        }
      };

      // Save to history and track analytics
      await addToQRHistory(qrData);
      await trackQRGeneration('wifi', qrOptions.width || 256);
      
      // Notify parent component
      onQRGenerated?.(qrData);
      
    } catch (err) {
      console.error('WiFi QR generation failed:', err);
      setError('Failed to generate WiFi QR code. Please try again.');
      setQrDataUrl('');
    } finally {
      setIsGenerating(false);
    }
  }, [wifiData, qrOptions, isValid, requiresPassword, onQRGenerated]);

  // Update WiFi data
  const updateWifiData = (updates: Partial<WiFiQRData>) => {
    setWifiData(prev => ({ ...prev, ...updates }));
    setQrDataUrl(''); // Clear previous QR code
    setError('');
  };

  // Download QR code
  const handleDownload = async () => {
    if (!qrDataUrl) return;
    
    try {
      const filename = `wifi-${wifiData.ssid.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
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
      
      setError('');
      
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Failed to copy to clipboard');
    }
  };

  // Clear form
  const clearForm = () => {
    setWifiData({
      ssid: '',
      password: '',
      security: 'WPA',
      hidden: false
    });
    setQrDataUrl('');
    setError('');
  };

  // Preset networks (common configurations)
  const presetNetworks = [
    { name: 'Guest Network', security: 'WPA' as const, hidden: false },
    { name: 'Open Network', security: 'nopass' as const, hidden: false },
    { name: 'Hidden Network', security: 'WPA' as const, hidden: true }
  ];

  const applyPreset = (preset: typeof presetNetworks[0]) => {
    updateWifiData({
      security: preset.security,
      hidden: preset.hidden,
      password: preset.security === 'nopass' ? '' : wifiData.password
    });
  };

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wifi className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">WiFi QR Generator</h3>
        </div>
        
        <button
          onClick={clearForm}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Quick Setup</label>
        <div className="flex flex-wrap gap-2">
          {presetNetworks.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* WiFi Configuration Form */}
      <div className="space-y-4">
        {/* Network Name (SSID) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Network Name (SSID) *
          </label>
          <input
            type="text"
            value={wifiData.ssid}
            onChange={(e) => updateWifiData({ ssid: e.target.value })}
            placeholder="MyWiFiNetwork"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={32}
          />
          {wifiData.ssid.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {wifiData.ssid.length}/32 characters
            </p>
          )}
        </div>

        {/* Security Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Security Type
          </label>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {([
              { value: 'WPA', label: 'WPA/WPA2', icon: Shield },
              { value: 'WEP', label: 'WEP', icon: Shield },
              { value: 'nopass', label: 'Open', icon: Wifi }
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => updateWifiData({ security: value, password: value === 'nopass' ? '' : wifiData.password })}
                className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  wifiData.security === value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Password (only for secured networks) */}
        {requiresPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={wifiData.password}
                onChange={(e) => updateWifiData({ password: e.target.value })}
                placeholder="Enter WiFi password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={63}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {wifiData.password.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {wifiData.password.length}/63 characters
              </p>
            )}
          </div>
        )}

        {/* Advanced Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Advanced Options</h4>
          
          {/* Hidden Network */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wifiData.hidden}
              onChange={(e) => updateWifiData({ hidden: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Hidden Network</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateQR}
        disabled={!isValid || isGenerating || (requiresPassword && !wifiData.password.trim())}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isGenerating ? 'Generating...' : 'Generate WiFi QR Code'}
      </button>

      {/* QR Preview */}
      {qrDataUrl && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
            <div className="bg-white p-2 rounded shadow-sm">
              <img
                src={qrDataUrl}
                alt="WiFi QR Code"
                className="block w-48 h-48"
              />
            </div>
          </div>
          
          {/* WiFi Details */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-blue-900">WiFi Details</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-medium">{wifiData.ssid}</span>
              </div>
              <div className="flex justify-between">
                <span>Security:</span>
                <span>{wifiData.security === 'nopass' ? 'Open' : wifiData.security}</span>
              </div>
              {wifiData.hidden && (
                <div className="flex justify-between">
                  <span>Hidden:</span>
                  <span>Yes</span>
                </div>
              )}
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

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800 mb-1">How to use:</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Open camera app on phone</li>
              <li>Point camera at QR code</li>
              <li>Tap notification to connect to WiFi</li>
            </ol>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isGenerating && !qrDataUrl && (
        <div className="bg-gray-50 rounded-lg p-8 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-600">Generating WiFi QR code...</p>
        </div>
      )}
      
      {/* Empty State */}
      {!qrDataUrl && !isGenerating && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Enter WiFi details to generate a QR code for easy sharing
          </p>
        </div>
      )}
    </div>
  );
};

export default WiFiQRGenerator;