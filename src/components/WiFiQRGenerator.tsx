/**
 * QR Super Generator - WiFi QR Code Generator Component
 * 
 * Specialized component for generating WiFi QR codes with
 * comprehensive form validation and user experience features
 */

import React, { useState, useEffect } from 'react';
import { Wifi, QrCode, Copy, Download, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { debug } from '../utils/debug';
import { qrService } from '../utils/qr-service';
import { storageService } from '../utils/storage-service';
import { WiFiQRData, QRCodeData, TypeValidator } from '../types';
import chromeAPIs from '../utils/chrome-apis';

interface WiFiQRGeneratorProps {
  onQRGenerated?: (qrData: QRCodeData) => void;
  onError?: (error: string) => void;
}

interface WiFiFormState {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

interface FormErrors {
  ssid?: string;
  password?: string;
  security?: string;
}

export default function WiFiQRGenerator({ onQRGenerated, onError }: WiFiQRGeneratorProps) {
  const [formState, setFormState] = useState<WiFiFormState>({
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [recentNetworks, setRecentNetworks] = useState<WiFiQRData[]>([]);

  const component = 'WiFiQRGenerator';

  useEffect(() => {
    debug.info(component, '📶 WiFi QR Generator initialized');
    loadRecentNetworks();
  }, []);

  const loadRecentNetworks = async () => {
    try {
      const history = await storageService.getQRHistory();
      const wifiQRs = history
        .filter(qr => qr.type === 'wifi')
        .slice(0, 5)
        .map(qr => {
          // Parse WiFi data from QR text
          const wifiMatch = qr.text.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);/);
          if (wifiMatch) {
            return {
              ssid: wifiMatch[2],
              password: wifiMatch[3],
              security: wifiMatch[1] as 'WPA' | 'WEP' | 'nopass',
              hidden: wifiMatch[4] === 'true'
            };
          }
          return null;
        })
        .filter(Boolean) as WiFiQRData[];

      setRecentNetworks(wifiQRs);
      debug.info(component, `✅ Loaded ${wifiQRs.length} recent WiFi networks`);
    } catch (error) {
      debug.error(component, '❌ Failed to load recent networks', error as Error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate SSID
    if (!formState.ssid.trim()) {
      newErrors.ssid = 'Network name (SSID) is required';
    } else if (formState.ssid.length > 32) {
      newErrors.ssid = 'Network name must be 32 characters or less';
    }

    // Validate password based on security type
    if (formState.security !== 'nopass') {
      if (!formState.password) {
        newErrors.password = 'Password is required for secured networks';
      } else if (formState.security === 'WPA' && formState.password.length < 8) {
        newErrors.password = 'WPA password must be at least 8 characters';
      } else if (formState.security === 'WEP' && ![5, 13, 10, 26].includes(formState.password.length)) {
        newErrors.password = 'WEP password must be 5, 10, 13, or 26 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof WiFiFormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleQuickSelect = (network: WiFiQRData) => {
    debug.trackUserAction(component, 'quick-select-network', 'recent-network', { ssid: network.ssid });
    setFormState({
      ssid: network.ssid,
      password: network.password,
      security: network.security,
      hidden: network.hidden
    });
    setErrors({});
  };

  const handleGenerateQR = async () => {
    debug.trackUserAction(component, 'generate-wifi-qr', 'generate-button');
    
    if (!validateForm()) {
      debug.warn(component, '⚠️ Form validation failed', errors);
      return;
    }

    setIsGenerating(true);

    try {
      debug.startPerformance('wifi-qr-generation', component);
      debug.info(component, '📶 Generating WiFi QR code', {
        ssid: formState.ssid,
        security: formState.security,
        hidden: formState.hidden
      });

      const wifiData: WiFiQRData = {
        ssid: formState.ssid,
        password: formState.password,
        security: formState.security,
        hidden: formState.hidden
      };

      const qrData = await qrService.generateWiFiQR(wifiData);
      
      debug.endPerformance('wifi-qr-generation', component);

      setGeneratedQR(qrData);
      await storageService.addToHistory(qrData);
      await loadRecentNetworks();

      if (onQRGenerated) {
        onQRGenerated(qrData);
      }

      debug.info(component, '✅ WiFi QR code generated successfully', {
        id: qrData.id,
        ssid: formState.ssid
      });

    } catch (error) {
      debug.endPerformance('wifi-qr-generation', component);
      debug.error(component, '❌ WiFi QR generation failed', error as Error);
      
      const errorMessage = (error as Error).message;
      setErrors({ ssid: errorMessage });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyQR = async () => {
    if (!generatedQR) return;
    
    debug.trackUserAction(component, 'copy-wifi-qr', 'copy-button');
    
    try {
      const success = await chromeAPIs.copyImageToClipboard(generatedQR.dataUrl);
      if (success) {
        debug.info(component, '✅ WiFi QR code copied to clipboard');
      } else {
        // Fallback to copying WiFi string
        await chromeAPIs.copyToClipboard(generatedQR.text);
        debug.info(component, '✅ WiFi connection string copied to clipboard');
      }
    } catch (error) {
      debug.error(component, '❌ Failed to copy WiFi QR code', error as Error);
    }
  };

  const handleDownloadQR = async () => {
    if (!generatedQR) return;
    
    debug.trackUserAction(component, 'download-wifi-qr', 'download-button');
    
    try {
      const filename = `wifi-qr-${formState.ssid.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`;
      const success = await chromeAPIs.downloadFile(generatedQR.dataUrl, filename);
      
      if (success) {
        debug.info(component, '✅ WiFi QR code download initiated', { filename });
      }
    } catch (error) {
      debug.error(component, '❌ Failed to download WiFi QR code', error as Error);
    }
  };

  const clearForm = () => {
    debug.trackUserAction(component, 'clear-form', 'clear-button');
    setFormState({
      ssid: '',
      password: '',
      security: 'WPA',
      hidden: false
    });
    setErrors({});
    setGeneratedQR(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">WiFi QR Generator</h2>
            <p className="text-gray-300 text-sm">Generate QR codes for WiFi network access</p>
          </div>
        </div>
      </div>

      {/* Recent Networks */}
      {recentNetworks.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h3 className="font-medium mb-3 text-white">Recent Networks</h3>
          <div className="space-y-2">
            {recentNetworks.map((network, index) => (
              <button
                key={index}
                onClick={() => handleQuickSelect(network)}
                className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white">{network.ssid}</span>
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {network.security}
                    </span>
                  </div>
                  <Wifi className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WiFi Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <h3 className="font-medium mb-4 text-white">Network Details</h3>
        
        <div className="space-y-4">
          {/* SSID */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Network Name (SSID) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formState.ssid}
              onChange={(e) => handleInputChange('ssid', e.target.value)}
              placeholder="Enter WiFi network name"
              className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-white placeholder-gray-400 ${
                errors.ssid ? 'border-red-500' : 'border-white/20'
              }`}
              maxLength={32}
            />
            {errors.ssid && (
              <div className="flex items-center mt-1 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {errors.ssid}
              </div>
            )}
          </div>

          {/* Security Type */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Security Type</label>
            <select
              value={formState.security}
              onChange={(e) => handleInputChange('security', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Open (No Password)</option>
            </select>
          </div>

          {/* Password */}
          {formState.security !== 'nopass' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formState.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter WiFi password"
                  className={`w-full bg-white/10 border rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-400 ${
                    errors.password ? 'border-red-500' : 'border-white/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center mt-1 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {errors.password}
                </div>
              )}
            </div>
          )}

          {/* Hidden Network */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="hidden"
              checked={formState.hidden}
              onChange={(e) => handleInputChange('hidden', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
            />
            <label htmlFor="hidden" className="text-sm text-white">
              Hidden Network
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleGenerateQR}
            disabled={isGenerating || !formState.ssid.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 px-4 rounded-lg transition-colors font-medium text-white flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>Generate WiFi QR</span>
              </>
            )}
          </button>
          
          <button
            onClick={clearForm}
            className="px-4 py-3 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Generated QR Display */}
      {generatedQR && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
          <div className="flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <h4 className="font-medium text-white">WiFi QR Code Generated</h4>
          </div>
          
          <div className="bg-white rounded-lg p-4 inline-block mb-4">
            <img 
              src={generatedQR.dataUrl} 
              alt="WiFi QR Code" 
              className="w-48 h-48"
            />
          </div>
          
          <div className="text-sm text-gray-300 mb-4">
            <p>Network: <span className="font-medium text-white">{formState.ssid}</span></p>
            <p>Security: <span className="font-medium text-white">{formState.security}</span></p>
            {formState.hidden && <p className="text-yellow-400">Hidden Network</p>}
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
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-white"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 