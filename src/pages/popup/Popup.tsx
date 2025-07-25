/**
 * QR Super Generator - Main Popup Component
 * 
 * Premium QR code generator with comprehensive debugging,
 * testing capabilities, and modern glassmorphism UI
 */

import React, { useState, useEffect } from 'react';
import { QrCode, Settings, History, Zap, Wifi, Layers, AlertTriangle } from 'lucide-react';
import { debug } from '../../utils/debug';
import { qrService } from '../../utils/qr-service';
import { storageService } from '../../utils/storage-service';
import { QRCodeData, QRCodeType } from '../../types';
import chromeAPIs from '../../utils/chrome-apis';
import QRGenerator from '../../components/QRGenerator';
import WiFiQRGenerator from '../../components/WiFiQRGenerator';
import BatchGenerator from '../../components/BatchGenerator';
// import PremiumFeatures from '../../components/PremiumFeatures'; // Disabled for free version

interface PopupState {
  activeTab: 'quick' | 'generator' | 'wifi' | 'batch' | 'history';
  error: string | null;
  history: QRCodeData[];
  // showPremium: boolean; // Removed for free version
  currentTabInfo: any;
  pendingGeneration: any;
  showWidget: boolean; // Widget auto-show setting
}

export default function Popup() {
  const [state, setState] = useState<PopupState>({
    activeTab: 'quick',
    error: null,
    history: [],
    // showPremium: false, // Removed for free version
    currentTabInfo: null,
    pendingGeneration: null,
    showWidget: false // Default to false
  });

  const component = 'Popup';

  useEffect(() => {
    debug.info(component, '🚀 QR Super Generator Popup initialized');
    debug.trackUserAction(component, 'popup-opened', 'extension-icon');
    
    initializePopup();
    loadHistory();
    checkPendingGeneration();
    getCurrentTabInfo();
    loadWidgetSetting(); // Load widget setting
  }, []);

  // Load widget auto-show setting
  const loadWidgetSetting = async () => {
    try {
      const result = await chrome.storage.local.get(['showWidget']);
      setState(prev => ({ 
        ...prev, 
        showWidget: result.showWidget === true 
      }));
    } catch (error) {
      debug.warn(component, 'Failed to load widget setting', error as Error);
    }
  };

  // Toggle widget auto-show setting
  const toggleWidgetSetting = async () => {
    try {
      const newValue = !state.showWidget;
      await chrome.storage.local.set({ showWidget: newValue });
      setState(prev => ({ ...prev, showWidget: newValue }));
      
      debug.info(component, `Widget auto-show ${newValue ? 'enabled' : 'disabled'}`);
      debug.trackUserAction(component, 'widget-toggled', newValue ? 'enabled' : 'disabled');
      
      // Show feedback
      if (newValue) {
        clearError(); // Clear any errors
      }
    } catch (error) {
      debug.error(component, 'Failed to toggle widget setting', error as Error);
      handleError('Failed to save widget setting');
    }
  };

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

  const getCurrentTabInfo = async () => {
    try {
      debug.debug(component, '🌐 Getting current tab information');
      
      const currentTab = await chromeAPIs.getCurrentTab();
      if (currentTab) {
        setState(prev => ({ ...prev, currentTabInfo: currentTab }));
        debug.info(component, '📄 Current tab loaded', {
          url: currentTab.url,
          title: currentTab.title
        });
      }
    } catch (error) {
      debug.warn(component, '⚠️ Could not access current tab', error as Error);
    }
  };

  const checkPendingGeneration = async () => {
    try {
      debug.debug(component, '🔍 Checking for pending QR generation');
      
      const result = await chromeAPIs.getStorage(['pendingQRGeneration']);
      if (result.pendingQRGeneration) {
        const pending = result.pendingQRGeneration;
        const age = Date.now() - pending.timestamp;
        
        if (age < 30000) { // Less than 30 seconds old
          setState(prev => ({ 
            ...prev, 
            pendingGeneration: pending,
            activeTab: 'generator'
          }));
          
          debug.info(component, '📋 Pending QR generation found', {
            source: pending.source,
            type: pending.type,
            age: Math.round(age / 1000) + 's'
          });
          
          // Clear the pending generation
          await chromeAPIs.removeStorage(['pendingQRGeneration']);
        }
      }
    } catch (error) {
      debug.warn(component, '⚠️ Failed to check pending generation', error as Error);
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

  const handleQRGenerated = async (qrData: QRCodeData) => {
    debug.info(component, '✅ QR code generated from component', { id: qrData.id, type: qrData.type });
    await loadHistory(); // Refresh history
  };

  const handleError = (error: string) => {
    debug.error(component, '❌ Component error', new Error(error));
    setState(prev => ({ ...prev, error }));
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const generateTestData = async () => {
    debug.trackUserAction(component, 'generate-test-data', 'test-button');
    
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
      handleError('Failed to generate test data');
    }
  };

  const clearHistory = async () => {
    debug.trackUserAction(component, 'clear-history', 'clear-button');
    
    if (confirm('Are you sure you want to clear all QR history?')) {
      try {
        await storageService.clearHistory();
        await loadHistory();
        debug.info(component, '✅ QR history cleared');
      } catch (error) {
        debug.error(component, '❌ Failed to clear history', error as Error);
        handleError('Failed to clear history');
      }
    }
  };

  const showCurrentTabQR = async () => {
    if (state.currentTabInfo?.url) {
      setState(prev => ({ 
        ...prev, 
        activeTab: 'generator',
        pendingGeneration: {
          text: state.currentTabInfo.url,
          type: 'url',
          source: 'current-tab'
        }
      }));
    }
  };

  return (
    <div className="w-[380px] min-h-[500px] max-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
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
            {state.currentTabInfo?.url && (
              <button
                onClick={showCurrentTabQR}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Generate QR for current page"
              >
                🌐
              </button>
            )}
            {/* Widget auto-show toggle */}
            <button
              onClick={toggleWidgetSetting}
              className={`p-2 rounded-lg transition-colors ${
                state.showWidget 
                  ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              }`}
              title={`Widget auto-show: ${state.showWidget ? 'ON' : 'OFF'}`}
            >
              {state.showWidget ? '👁️' : '🚫'}
            </button>
            {/* Premium button removed for free version */}
          </div>
        </div>
        
        {/* Current Tab Info */}
        {state.currentTabInfo && (
          <div className="mt-2 text-xs text-gray-300">
            <p className="truncate" title={state.currentTabInfo.url}>
              📄 {state.currentTabInfo.title || 'Current Page'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="relative z-10 bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="flex">
          {[
            { id: 'quick', icon: Zap, label: 'Quick' },
            { id: 'generator', icon: QrCode, label: 'Generator' },
            { id: 'wifi', icon: Wifi, label: 'WiFi' },
            { id: 'batch', icon: Layers, label: 'Batch' },
            { id: 'history', icon: History, label: 'History' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  debug.trackUserAction(component, 'tab-changed', `${tab.id}-tab`, { tab: tab.id });
                  setState(prev => ({ ...prev, activeTab: tab.id as any }));
                }}
                className={`flex-1 flex flex-col items-center py-3 px-1 text-xs transition-all ${
                  isActive 
                    ? 'text-purple-300 bg-white/10' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 p-4 overflow-y-auto max-h-[400px]">
        {/* Error Display */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 text-sm">{state.error}</p>
              <button
                onClick={clearError}
                className="text-red-300 hover:text-red-100 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {state.activeTab === 'quick' && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <button
                  onClick={() => setState(prev => ({ ...prev, activeTab: 'generator' }))}
                  className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:scale-105 transition-transform flex flex-col items-center space-y-2"
                >
                  <QrCode className="w-6 h-6" />
                  <span>Custom QR</span>
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, activeTab: 'wifi' }))}
                  className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:scale-105 transition-transform flex flex-col items-center space-y-2"
                >
                  <Wifi className="w-6 h-6" />
                  <span>WiFi QR</span>
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, activeTab: 'batch' }))}
                  className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg hover:scale-105 transition-transform flex flex-col items-center space-y-2"
                >
                  <Layers className="w-6 h-6" />
                  <span>Batch QR</span>
                </button>
                <button
                  onClick={showCurrentTabQR}
                  disabled={!state.currentTabInfo?.url}
                  className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg hover:scale-105 transition-transform flex flex-col items-center space-y-2 disabled:opacity-50"
                >
                  <span className="text-lg">🌐</span>
                  <span>Current Page</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {state.activeTab === 'generator' && (
          <QRGenerator
            onQRGenerated={handleQRGenerated}
            onError={handleError}
            initialText={state.pendingGeneration?.text || state.currentTabInfo?.url || ''}
            initialType={state.pendingGeneration?.type || 'url'}
          />
        )}

        {state.activeTab === 'wifi' && (
          <WiFiQRGenerator
            onQRGenerated={handleQRGenerated}
            onError={handleError}
          />
        )}

        {state.activeTab === 'batch' && (
          <BatchGenerator
            onBatchGenerated={(qrCodes) => {
              debug.info(component, `✅ Batch generation completed: ${qrCodes.length} QR codes`);
              loadHistory();
            }}
            onError={handleError}
          />
        )}

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
                  <div className="flex flex-col gap-1">
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {qr.type}
                    </span>
                  </div>
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

        {/* Premium features removed for free version */}
      </div>

      {/* Premium Modal overlay handled by PremiumFeatures component */}
    </div>
  );
}
