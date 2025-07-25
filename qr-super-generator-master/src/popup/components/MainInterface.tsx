import React, { useState, useEffect } from 'react';
import { QrCode, Zap, Settings, History, BarChart3, Sparkles, Crown } from 'lucide-react';
import { getCurrentTab } from '../../utils/chrome-apis';
import { initializeStorage } from '../../utils/storage';
import { QRCodeData, ExtensionTab } from '../../types';
import QuickActions from './QuickActions';
import SettingsPanel from './SettingsPanel';
import HistoryPanel from './HistoryPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import QRGenerator from './QRGenerator';
import WiFiQRGenerator from './WiFiQRGenerator';
import BatchGenerator from './BatchGenerator';

type ViewType = 'quick' | 'generator' | 'wifi' | 'batch' | 'history' | 'analytics' | 'settings';

interface MainInterfaceProps {
  onQRGenerated?: (qrData: QRCodeData) => void;
}

const MainInterface: React.FC<MainInterfaceProps> = ({ onQRGenerated }) => {
  const [currentView, setCurrentView] = useState<ViewType>('quick');
  const [currentTab, setCurrentTab] = useState<ExtensionTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentQRCodes, setRecentQRCodes] = useState<QRCodeData[]>([]);

  useEffect(() => {
    async function initialize() {
      try {
        await initializeStorage();
        const tab = await getCurrentTab();
        setCurrentTab(tab);
        
        chrome.storage.local.get(['qrHistory'], (result) => {
          if (result.qrHistory) {
            setRecentQRCodes(result.qrHistory.slice(0, 5));
          }
        });
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  const handleQRGenerated = (qrData: QRCodeData) => {
    setRecentQRCodes(prev => {
      const filtered = prev.filter(item => item.text !== qrData.text);
      return [qrData, ...filtered].slice(0, 5);
    });
    onQRGenerated?.(qrData);
  };

  const navigationItems = [
    { id: 'quick' as ViewType, icon: Zap, label: 'Quick', description: 'Instant QR' },
    { id: 'generator' as ViewType, icon: QrCode, label: 'Custom', description: 'Advanced' },
    { id: 'history' as ViewType, icon: History, label: 'History', description: 'Recent codes' },
    { id: 'analytics' as ViewType, icon: BarChart3, label: 'Stats', description: 'Usage data' },
    { id: 'settings' as ViewType, icon: Settings, label: 'Settings', description: 'Preferences' },
  ];

  if (loading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm">Initializing premium features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-3xl floating-element"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full blur-2xl floating-element" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/3 left-3/4 w-24 h-24 bg-gradient-to-br from-accent-500/10 to-blue-500/10 rounded-full blur-xl floating-element" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-xl floating-element" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 glass-dark border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <QrCode className="w-6 h-6 text-primary-400" />
              <Crown className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg gradient-text">QR Super Generator</h1>
              <p className="text-xs text-gray-400 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Premium Edition
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs text-gray-400">Domain</p>
              <p className="text-xs font-mono text-primary-300 truncate max-w-24">
                {currentTab?.url ? new URL(currentTab.url).hostname : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="relative z-10 glass-dark border-b border-white/10">
        <div className="flex overflow-x-auto scrollbar-thin">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-3 text-xs font-medium transition-all duration-300 relative group cursor-pointer ${
                  isActive
                    ? 'text-primary-300 bg-primary-500/20 shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/10 hover:shadow-md'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="mb-0.5">{item.label}</span>
                <span className="text-xs text-gray-500">{item.description}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-purple-blue rounded-full animate-pulse-neon"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 pb-6">
        <div className="animate-fade-in">
          {currentView === 'quick' && (
            <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
              <QuickActions 
                currentTab={currentTab}
                onQRGenerated={handleQRGenerated}
              />
            </div>
          )}

          {currentView === 'generator' && (
            <div className="space-y-6">
              <div className="glass-card" style={{ animation: 'slideInUp 0.4s ease-out' }}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <QrCode className="w-5 h-5 mr-2 text-primary-400" />
                  Advanced Generator
                </h3>
                <QRGenerator
                  initialType="custom"
                  onQRGenerated={handleQRGenerated}
                />
              </div>
              
              <div className="glass-card" style={{ animation: 'slideInUp 0.4s ease-out 0.1s both' }}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="w-5 h-5 mr-2 text-accent-400">📶</span>
                  WiFi QR Generator
                </h3>
                <WiFiQRGenerator onQRGenerated={handleQRGenerated} />
              </div>
              
              <div className="glass-card" style={{ animation: 'slideInUp 0.4s ease-out 0.2s both' }}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="w-5 h-5 mr-2 text-green-400">⚡</span>
                  Batch Generator
                </h3>
                <BatchGenerator
                  onBatchComplete={(results) => {
                    if (results.length > 0) {
                      setRecentQRCodes(prev => {
                        const combined = [...results, ...prev];
                        return combined.slice(0, 10);
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}

          {currentView === 'history' && (
            <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
              <HistoryPanel 
                recentQRCodes={recentQRCodes}
                onClearHistory={() => setRecentQRCodes([])}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
              <AnalyticsDashboard />
            </div>
          )}

          {currentView === 'settings' && (
            <div style={{ animation: 'slideInUp 0.4s ease-out' }}>
              <SettingsPanel />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 glass-dark border-t border-white/10 p-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Premium Active</span>
          </div>
          <div className="text-gray-500">
            ⌘+Shift+Q for quick access
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainInterface;