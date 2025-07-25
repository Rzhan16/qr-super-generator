import React, { useState, useEffect } from 'react';
import { Zap, Link, Copy, Download, Share, ExternalLink, Globe, Clock, Star, Sparkles } from 'lucide-react';
import { generateQRCode } from '../../utils/qr-generator';
import { addToQRHistory } from '../../utils/storage';
import { QRCodeData, ExtensionTab } from '../../types';

interface QuickActionsProps {
  currentTab: ExtensionTab | null;
  onQRGenerated: (qrData: QRCodeData) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ currentTab, onQRGenerated }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentDomains, setRecentDomains] = useState<string[]>([]);

  useEffect(() => {
    // Load recent domains from storage
    chrome.storage.local.get(['recentDomains'], (result) => {
      if (result.recentDomains) {
        setRecentDomains(result.recentDomains.slice(0, 3));
      }
    });
  }, []);

  useEffect(() => {
    if (currentTab?.url) {
      generateCurrentPageQR();
    }
  }, [currentTab]);

  const generateCurrentPageQR = async () => {
    if (!currentTab?.url) return;

    setLoading(true);
    try {
      const dataUrl = await generateQRCode(currentTab.url, {
        width: 200,
        color: {
          dark: '#9333ea',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      setQrDataUrl(dataUrl);

      const qrData: QRCodeData = {
        id: Date.now(),
        text: currentTab.url,
        dataUrl,
        timestamp: new Date().toISOString(),
        type: 'url',
        title: currentTab.title || 'Untitled Page'
      };

      await addToQRHistory(qrData);
      onQRGenerated(qrData);

      // Update recent domains
      const domain = new URL(currentTab.url).hostname;
      setRecentDomains(prev => {
        const filtered = prev.filter(d => d !== domain);
        const updated = [domain, ...filtered].slice(0, 3);
        chrome.storage.local.set({ recentDomains: updated });
        return updated;
      });

    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy QR code:', error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl || !currentTab) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${currentTab.title?.replace(/[^a-z0-9]/gi, '_') || 'qr_code'}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!currentTab?.url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTab.title || 'Shared Page',
          url: currentTab.url
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  const quickActions = [
    {
      id: 'copy',
      icon: Copy,
      label: copied ? 'Copied!' : 'Copy QR',
      action: handleCopyImage,
      gradient: 'from-blue-500 to-cyan-500',
      disabled: !qrDataUrl,
      success: copied
    },
    {
      id: 'download',
      icon: Download,
      label: 'Download',
      action: handleDownload,
      gradient: 'from-green-500 to-emerald-500',
      disabled: !qrDataUrl
    },
    {
      id: 'share',
      icon: Share,
      label: 'Share',
      action: handleShare,
      gradient: 'from-purple-500 to-pink-500',
      disabled: !currentTab?.url
    },
    {
      id: 'visit',
      icon: ExternalLink,
      label: 'Visit',
      action: () => currentTab?.url && chrome.tabs.create({ url: currentTab.url }),
      gradient: 'from-orange-500 to-red-500',
      disabled: !currentTab?.url
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card text-center">
        <div className="flex items-center justify-center mb-3">
          <Zap className="w-6 h-6 text-primary-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Quick QR Generator</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Instantly generate QR codes for the current page
        </p>
      </div>

      {/* Current Page Info */}
      {currentTab && (
        <div className="glass-card">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              {currentTab.favIconUrl ? (
                <img src={currentTab.favIconUrl} alt="Favicon" className="w-8 h-8 rounded" />
              ) : (
                <Globe className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">
                {currentTab.title || 'Untitled Page'}
              </h3>
              <p className="text-sm text-gray-400 break-all">
                {currentTab.url}
              </p>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="glass-dark rounded-xl p-6 text-center relative overflow-hidden">
            {loading ? (
              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl animate-pulse flex items-center justify-center relative">
                  <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-xl"></div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                  <p className="text-gray-400 text-sm">Generating premium QR code...</p>
                  <div className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
            ) : qrDataUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl opacity-75 group-hover:opacity-100 transition duration-300 blur-sm"></div>
                  <div className="relative bg-white p-3 rounded-xl">
                    <img 
                      src={qrDataUrl} 
                      alt="QR Code" 
                      className="w-44 h-44 mx-auto rounded-lg"
                    />
                  </div>
                  <div className="absolute -top-3 -right-3">
                    <div className="glass rounded-full p-2 glow-primary">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Generated {new Date().toLocaleTimeString()}</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600">
                  <div className="text-center text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Navigate to a page to generate QR</p>
                  </div>
                </div>
              </div>
            )}

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 pointer-events-none rounded-xl"></div>
            <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-lg"></div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled}
                style={{ animation: `slideInUp 0.4s ease-out ${index * 0.1}s both` }}
                className={`glass-button p-4 text-center transition-all duration-300 relative overflow-hidden group ${
                  action.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-105 active:scale-95 hover:shadow-lg hover:border-white/40'
                } ${action.success ? 'bg-green-500/20 border-green-400 glow-accent' : ''}`}
              >
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-10 rounded-lg transition-opacity duration-300 group-hover:opacity-20`}></div>
                
                {/* Icon */}
                <div className={`relative w-10 h-10 mx-auto mb-3 p-2 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Label */}
                <span className="relative text-sm font-medium text-white group-hover:text-gray-100 transition-colors duration-300">{action.label}</span>
                
                {/* Success indicator */}
                {action.success && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                )}
                
                {/* Shimmer effect */}
                {!action.disabled && (
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-lg"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Domains */}
      {recentDomains.length > 0 && (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-accent-400" />
            Recent Domains
          </h3>
          <div className="space-y-2">
            {recentDomains.map((domain, index) => (
              <div
                key={domain}
                className="glass-dark rounded-lg p-3 flex items-center space-x-3 hover:bg-white/10 transition-colors"
              >
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <span className="text-gray-300 font-mono text-sm">{domain}</span>
                <div className="flex-1"></div>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro Tip */}
      <div className="glass-card bg-gradient-to-r from-primary-500/10 to-accent-500/10">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-6 h-6 bg-gradient-purple-blue rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Pro Tip</h4>
            <p className="text-gray-400 text-xs">
              Use keyboard shortcut ⌘+Shift+Q (Ctrl+Shift+Q) to quickly generate QR codes without opening the popup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;