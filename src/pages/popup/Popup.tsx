/**
 * QR Super Generator - Main Popup Component
 * 
 * Premium QR code generator with comprehensive debugging,
 * testing capabilities, and modern glassmorphism UI
 */

import React, { useState, useEffect } from 'react';
import { QrCode, Settings, History, Bug, Zap, Download, Copy, Wifi, Contact, Mail, Phone, MessageSquare, TestTube, AlertTriangle } from 'lucide-react';
import { debug } from '../../utils/debug';
import { qrService } from '../../utils/qr-service';
import { storageService } from '../../utils/storage-service';
import { QRCodeData, QRCodeType, TypeValidator, TEST_WIFI_DATA, TEST_CONTACT_DATA } from '../../types';
import DebugPanel from '../../components/DebugPanel';

interface PopupState {
  activeTab: 'quick' | 'generator' | 'history' | 'settings' | 'debug';
  qrText: string;
  qrType: QRCodeType;
  generatedQR: QRCodeData | null;
  isGenerating: boolean;
  error: string | null;
  history: QRCodeData[];
  debugPanelOpen: boolean;
}

export default function Popup() {
  const [state, setState] = useState<PopupState>({
    activeTab: 'quick',
    qrText: '',
    qrType: 'text',
    generatedQR: null,
    isGenerating: false,
    error: null,
    history: [],
    debugPanelOpen: false
  });

  const component = 'Popup';

  useEffect(() => {
    debug.info(component, '🚀 QR Super Generator Popup initialized');
    debug.trackUserAction(component, 'popup-opened');
    
    initializePopup();
    loadHistory();
    
    // Auto-generate QR for current tab if applicable
    getCurrentTabAndGenerate();
  }, []);

  const initializePopup = async () => {
    try {
      debug.debug(component, '🔧 Initializing popup components');
      
      // Test core functionality on startup
      await testCoreFunctionality();
      
    } catch (error) {
      debug.error(component, '❌ Popup initialization failed', error as Error);
      setState(prev => ({ ...prev, error: 'Failed to initialize extension' }));
    }
  };

  const testCoreFunctionality = async () => {
    debug.info(component, '🧪 Running core functionality tests');
    
    try {
      // Test basic QR generation
      const testQR = await qrService.generateQRCode('Test', { width: 64 });
      debug.info(component, '✅ Core QR generation test passed', { id: testQR.id });
      
      // Test storage
      const settings = await storageService.getSettings();
      debug.info(component, '✅ Storage access test passed', { debugMode: settings.debugMode });
      
    } catch (error) {
      debug.error(component, '❌ Core functionality test failed', error as Error);
      throw error;
    }
  };

  const getCurrentTabAndGenerate = async () => {
    try {
      debug.debug(component, '🌐 Getting current tab information');
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab?.url && currentTab.url.startsWith('http')) {
          debug.info(component, '📄 Current tab detected', {
            url: currentTab.url,
            title: currentTab.title
          });
          
          setState(prev => ({
            ...prev,
            qrText: currentTab.url,
            qrType: 'url'
          }));
          
          // Auto-generate if enabled
          const settings = await storageService.getSettings();
          if (settings.autoGenerate) {
            debug.info(component, '⚡ Auto-generating QR for current tab');
            handleGenerateQR(currentTab.url, 'url');
          }
        }
      }
    } catch (error) {
      debug.warn(component, '⚠️ Could not access current tab', error as Error);
      // This is expected in some contexts, not a critical error
    }
  };

  const loadHistory = async () => {
    try {
      debug.debug(component, '📜 Loading QR history');
      const history = await storageService.getQRHistory();
      setState(prev => ({ ...prev, history }));
      debug.info(component, `✅ Loaded ${history.length} QR codes from history`);
    } catch (error) {
      debug.error(component, '❌ Failed to load history', error as Error);
    }
  };

  const handleGenerateQR = async (text?: string, type?: QRCodeType) => {
    const qrText = text || state.qrText;
    const qrType = type || state.qrType;
    
    debug.trackUserAction(component, 'generate-qr-clicked', { type: qrType, textLength: qrText.length });
    
    if (!qrText.trim()) {
      const error = 'Please enter text for the QR code';
      debug.warn(component, '⚠️ Empty QR text provided');
      setState(prev => ({ ...prev, error }));
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      debug.startPerformance('qr-generation-ui', component);
      debug.info(component, '🎯 Generating QR code', { text: qrText.substring(0, 50) + '...', type: qrType });
      
      // Validate input
      const validation = TypeValidator.validateQRText(qrText);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      const qrData = await qrService.generateQRCode(qrText, {
        width: 256,
        color: {
          dark: '#9333ea',
          light: '#ffffff'
        }
      }, qrType);
      
      debug.endPerformance('qr-generation-ui', component);
      
      setState(prev => ({ ...prev, generatedQR: qrData, isGenerating: false }));
      
      // Add to history
      await storageService.addToHistory(qrData);
      await loadHistory();
      
      debug.info(component, '✅ QR code generated successfully', {
        id: qrData.id,
        type: qrData.type,
        title: qrData.title
      });
      
    } catch (error) {
      debug.endPerformance('qr-generation-ui', component);
      debug.error(component, '❌ QR generation failed', error as Error, { text: qrText, type: qrType });
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message, 
        isGenerating: false 
      }));
    }
  };

  const handleQuickGenerate = async (type: QRCodeType, data?: any) => {
    debug.trackUserAction(component, 'quick-generate', { type });
    
    try {
      let qrData: QRCodeData;
      
      switch (type) {
        case 'wifi':
          qrData = await qrService.generateWiFiQR(data || TEST_WIFI_DATA);
          break;
        case 'contact':
          qrData = await qrService.generateContactQR(data || TEST_CONTACT_DATA);
          break;
        case 'email':
          qrData = await qrService.generateEmailQR(
            data?.email || 'test@example.com',
            data?.subject || 'Hello from QR Generator',
            data?.body || 'This email was generated from a QR code!'
          );
          break;
        case 'phone':
          qrData = await qrService.generatePhoneQR(data?.phone || '+1-555-123-4567');
          break;
        case 'sms':
          qrData = await qrService.generateSMSQR(
            data?.phone || '+1-555-123-4567',
            data?.message || 'Hello from QR Generator!'
          );
          break;
        default:
          throw new Error(`Unsupported quick generate type: ${type}`);
      }
      
      setState(prev => ({ ...prev, generatedQR: qrData }));
      await storageService.addToHistory(qrData);
      await loadHistory();
      
      debug.info(component, `✅ Quick ${type} QR generated`, { id: qrData.id });
      
    } catch (error) {
      debug.error(component, `❌ Quick ${type} generation failed`, error as Error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  };

  const handleCopyQR = async () => {
    if (!state.generatedQR) return;
    
    debug.trackUserAction(component, 'copy-qr', { id: state.generatedQR.id });
    
    try {
      const response = await fetch(state.generatedQR.dataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      debug.info(component, '✅ QR code copied to clipboard');
      
    } catch (error) {
      debug.error(component, '❌ Failed to copy QR code', error as Error);
      
      // Fallback: copy text
      try {
        await navigator.clipboard.writeText(state.generatedQR.text);
        debug.info(component, '✅ QR text copied to clipboard (fallback)');
      } catch (fallbackError) {
        debug.error(component, '❌ Failed to copy QR text', fallbackError as Error);
      }
    }
  };

  const handleDownloadQR = () => {
    if (!state.generatedQR) return;
    
    debug.trackUserAction(component, 'download-qr', { id: state.generatedQR.id });
    
    try {
      const link = document.createElement('a');
      link.href = state.generatedQR.dataUrl;
      link.download = `qr-${state.generatedQR.type}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      debug.info(component, '✅ QR code downloaded');
      
    } catch (error) {
      debug.error(component, '❌ Failed to download QR code', error as Error);
    }
  };

  const generateTestData = async () => {
    debug.trackUserAction(component, 'generate-test-data');
    
    try {
      debug.info(component, '🎲 Generating test QR codes');
      const testQRs = await qrService.generateTestQRCodes();
      
      for (const qr of testQRs) {
        await storageService.addToHistory(qr);
      }
      
      await loadHistory();
      
      debug.info(component, `✅ Generated ${testQRs.length} test QR codes`);
      
    } catch (error) {
      debug.error(component, '❌ Failed to generate test data', error as Error);
    }
  };

  const clearHistory = async () => {
    debug.trackUserAction(component, 'clear-history');
    
    if (confirm('Are you sure you want to clear all QR history?')) {
      try {
        await storageService.clearHistory();
        await loadHistory();
        debug.info(component, '✅ QR history cleared');
      } catch (error) {
        debug.error(component, '❌ Failed to clear history', error as Error);
      }
    }
  };

  return (
    <div className="w-[400px] min-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-gradient-to-br from-transparent via-purple-500/5 to-blue-500/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)] animate-pulse"></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">QR Super Generator</h1>
              <p className="text-xs text-gray-300">Premium Edition v1.0.0</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setState(prev => ({ ...prev, debugPanelOpen: true }))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Open Debug Panel"
            >
              <Bug className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="relative z-10 bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="flex">
          {[
            { id: 'quick', icon: Zap, label: 'Quick' },
            { id: 'generator', icon: QrCode, label: 'Generator' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'debug', icon: TestTube, label: 'Debug' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  debug.trackUserAction(component, 'tab-changed', { tab: tab.id });
                  setState(prev => ({ ...prev, activeTab: tab.id as any }));
                }}
                className={`flex-1 flex flex-col items-center py-3 px-2 text-xs transition-all ${
                  isActive 
                    ? 'text-purple-300 bg-white/10' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 p-4 overflow-y-auto">
        {/* Error Display */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 text-sm">{state.error}</p>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="text-red-300 hover:text-red-100 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Quick Tab */}
        {state.activeTab === 'quick' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { type: 'wifi' as QRCodeType, icon: Wifi, label: 'WiFi', color: 'from-green-500 to-emerald-500' },
                  { type: 'contact' as QRCodeType, icon: Contact, label: 'Contact', color: 'from-blue-500 to-cyan-500' },
                  { type: 'email' as QRCodeType, icon: Mail, label: 'Email', color: 'from-red-500 to-pink-500' },
                  { type: 'phone' as QRCodeType, icon: Phone, label: 'Phone', color: 'from-purple-500 to-violet-500' }
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.type}
                      onClick={() => handleQuickGenerate(action.type)}
                      className={`p-3 bg-gradient-to-r ${action.color} rounded-lg hover:scale-105 transition-transform flex flex-col items-center space-y-1`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generated QR Display */}
            {state.generatedQR && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
                <h4 className="font-medium mb-3">{state.generatedQR.title}</h4>
                <div className="bg-white rounded-lg p-4 inline-block">
                  <img 
                    src={state.generatedQR.dataUrl} 
                    alt="Generated QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleCopyQR}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generator Tab */}
        {state.activeTab === 'generator' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold mb-3 flex items-center">
                <QrCode className="w-5 h-5 mr-2 text-purple-400" />
                Custom Generator
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={state.qrType}
                    onChange={(e) => {
                      debug.trackUserAction(component, 'qr-type-changed', { type: e.target.value });
                      setState(prev => ({ ...prev, qrType: e.target.value as QRCodeType }));
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="text">Text</option>
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Content ({state.qrText.length}/4296)
                  </label>
                  <textarea
                    value={state.qrText}
                    onChange={(e) => {
                      debug.trackUserAction(component, 'qr-text-changed', { length: e.target.value.length });
                      setState(prev => ({ ...prev, qrText: e.target.value }));
                    }}
                    placeholder={`Enter ${state.qrType} content...`}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white h-20 resize-none"
                  />
                </div>
                
                <button
                  onClick={() => handleGenerateQR()}
                  disabled={state.isGenerating || !state.qrText.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 px-4 rounded-lg transition-colors font-medium"
                >
                  {state.isGenerating ? 'Generating...' : 'Generate QR Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {state.activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-400" />
                QR History ({state.history.length})
              </h3>
              <button
                onClick={clearHistory}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-2">
              {state.history.slice(0, 10).map((qr) => (
                <div key={qr.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 flex items-center space-x-3">
                  <img src={qr.dataUrl} alt="QR" className="w-12 h-12 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{qr.title}</p>
                    <p className="text-sm text-gray-300 truncate">{qr.text}</p>
                    <p className="text-xs text-gray-400">{new Date(qr.timestamp).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setState(prev => ({ ...prev, generatedQR: qr, activeTab: 'quick' }))}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </button>
                </div>
              ))}
              {state.history.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No QR codes generated yet</p>
                  <button
                    onClick={generateTestData}
                    className="mt-2 text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Generate Test Data
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Tab */}
        {state.activeTab === 'debug' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold mb-3 flex items-center">
                <TestTube className="w-5 h-5 mr-2 text-green-400" />
                Debug & Testing
              </h3>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  onClick={() => setState(prev => ({ ...prev, debugPanelOpen: true }))}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  🔧 Debug Panel
                </button>
                <button
                  onClick={generateTestData}
                  className="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  🎲 Test Data
                </button>
                <button
                  onClick={() => {
                    console.log('QR Service:', qrService);
                    console.log('Storage Service:', storageService);
                    console.log('Debug Logger:', debug);
                    debug.info(component, 'Console objects logged for inspection');
                  }}
                  className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  📊 Console Log
                </button>
                <button
                  onClick={() => {
                    // Trigger a test error for debugging
                    debug.error(component, 'Test error triggered', new Error('This is a test error'));
                  }}
                  className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  ⚠️ Test Error
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <DebugPanel
        isOpen={state.debugPanelOpen}
        onClose={() => setState(prev => ({ ...prev, debugPanelOpen: false }))}
      />
    </div>
  );
}
