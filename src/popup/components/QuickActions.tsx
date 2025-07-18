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
                <div className="w-48 h-48 mx-auto bg-gray-700 rounded-xl animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-400 text-sm">Generating QR code...</p>
              </div>
            ) : qrDataUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto rounded-xl shadow-glass-lg neon-border"
                  />
                  <div className="absolute -top-2 -right-2">
                    <div className="glass rounded-full p-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Generated {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto bg-gray-700 rounded-xl flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">No page loaded</p>
                  </div>
                </div>
              </div>
            )}

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                disabled={action.disabled}
                className={`glass-button p-4 text-center transition-all duration-300 relative overflow-hidden group ${
                  action.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-105 active:scale-95 hover:shadow-neon-sm'
                } ${action.success ? 'bg-green-500/20 border-green-400' : ''}`}
              >
                <div className={`w-8 h-8 mx-auto mb-2 p-1 rounded-lg bg-gradient-to-r ${action.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">{action.label}</span>
                
                {/* Shimmer effect */}
                {!action.disabled && (
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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