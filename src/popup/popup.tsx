import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QrCode, Wifi, Layers, Zap, Settings, History, Plus, Copy, Download } from 'lucide-react';
import { getCurrentTab } from '../utils/chrome-apis';
import { initializeStorage } from '../utils/storage';
import QRGenerator from './components/QRGenerator';
import WiFiQRGenerator from './components/WiFiQRGenerator';
import BatchGenerator from './components/BatchGenerator';
import { QRCodeData, ExtensionTab } from '../types';
import './styles.css';

type TabType = 'quick' | 'custom' | 'wifi' | 'batch' | 'history';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ExtensionTab | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [loading, setLoading] = useState(true);
  const [recentQRCodes, setRecentQRCodes] = useState<QRCodeData[]>([]);

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize storage
        await initializeStorage();
        
        // Get current tab information
        const tab = await getCurrentTab();
        setCurrentTab(tab);
        
        // Load recent QR codes from storage
        chrome.storage.local.get(['qrHistory'], (result) => {
          if (result.qrHistory) {
            setRecentQRCodes(result.qrHistory.slice(0, 5));
          }
        });
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  // Handle QR generation completion
  const handleQRGenerated = (qrData: QRCodeData) => {
    // Update recent QR codes
    setRecentQRCodes(prev => {
      const filtered = prev.filter(item => item.text !== qrData.text);
      return [qrData, ...filtered].slice(0, 5);
    });
  };

  // Tab configuration
  const tabs = [
    {
      id: 'quick' as TabType,
      label: 'Quick',
      icon: Zap,
      description: 'Current page QR'
    },
    {
      id: 'custom' as TabType,
      label: 'Custom',
      icon: QrCode,
      description: 'Custom text/URL'
    },
    {
      id: 'wifi' as TabType,
      label: 'WiFi',
      icon: Wifi,
      description: 'WiFi credentials'
    },
    {
      id: 'batch' as TabType,
      label: 'Batch',
      icon: Layers,
      description: 'Multiple tabs'
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: History,
      description: 'Recent QR codes'
    }
  ];

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h1 className="font-semibold text-gray-900">QR Super Generator</h1>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-6">
        {activeTab === 'quick' && (
          <div className="space-y-4">
            {currentTab && (
              <QRGenerator
                initialText={currentTab.url || ''}
                initialType="url"
                onQRGenerated={handleQRGenerated}
              />
            )}
            
            {recentQRCodes.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Recent QR Codes</h3>
                <div className="space-y-2">
                  {recentQRCodes.map((qr) => (
                    <div key={qr.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <img src={qr.dataUrl} alt="QR" className="w-8 h-8 border rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{qr.title}</p>
                        <p className="text-xs text-gray-500 truncate">{qr.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <QRGenerator
            initialType="custom"
            onQRGenerated={handleQRGenerated}
          />
        )}

        {activeTab === 'wifi' && (
          <WiFiQRGenerator
            onQRGenerated={handleQRGenerated}
          />
        )}

        {activeTab === 'batch' && (
          <BatchGenerator
            onBatchComplete={(results) => {
              // Update recent QR codes with batch results
              if (results.length > 0) {
                setRecentQRCodes(prev => {
                  const combined = [...results, ...prev];
                  return combined.slice(0, 10);
                });
              }
            }}
          />
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">QR Code History</h3>
              <button
                onClick={() => {
                  chrome.storage.local.set({ qrHistory: [] });
                  setRecentQRCodes([]);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            
            {recentQRCodes.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No QR codes generated yet</p>
                <button
                  onClick={() => setActiveTab('quick')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Generate your first QR code
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQRCodes.map((qr) => (
                  <div key={qr.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <img src={qr.dataUrl} alt="QR" className="w-12 h-12 border rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{qr.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          qr.type === 'url' ? 'bg-blue-100 text-blue-800' :
                          qr.type === 'wifi' ? 'bg-green-100 text-green-800' :
                          qr.type === 'text' ? 'bg-gray-100 text-gray-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {qr.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 break-all">{qr.text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(qr.timestamp).toLocaleDateString()} {new Date(qr.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(qr.dataUrl);
                            const blob = await response.blob();
                            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                          } catch (err) {
                            console.error('Copy failed:', err);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qr.dataUrl;
                          link.download = `${qr.title.replace(/[^a-z0-9]/gi, '_')}.png`;
                          link.click();
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-4 py-2">
        <p className="text-xs text-gray-500 text-center">
          Press Ctrl+Shift+Q (⌘+Shift+Q) for quick QR generation
        </p>
      </div>
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} 