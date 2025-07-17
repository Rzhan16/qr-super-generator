import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QrCode, Download, Copy, Settings, History, Zap } from 'lucide-react';
import { generateQRCode, QROptions } from '../utils/qr-generator';
import { getCurrentTab, downloadFile } from '../utils/chrome-apis';
import './styles.css';

interface Tab {
  id?: number;
  url?: string;
  title?: string;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [qrOptions, setQrOptions] = useState<QROptions>({
    width: 256,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });

  useEffect(() => {
    // Get current tab information
    getCurrentTab().then(tab => {
      setCurrentTab(tab);
    }).catch(error => {
      console.error('Failed to get current tab:', error);
    });
  }, []);

  const handleGenerateQR = async (text?: string) => {
    setIsGenerating(true);
    try {
      const qrText = text || currentTab?.url || '';
      if (!qrText) {
        throw new Error('No URL or text to generate QR code');
      }

      const dataUrl = await generateQRCode(qrText, qrOptions);
      setQrDataUrl(dataUrl);
      
      // Save to storage for history
      chrome.storage.local.get(['qrHistory'], (result) => {
        const history = result.qrHistory || [];
        const newEntry = {
          id: Date.now(),
          text: qrText,
          dataUrl,
          timestamp: new Date().toISOString(),
          title: currentTab?.title || 'Custom QR Code'
        };
        
        const updatedHistory = [newEntry, ...history.slice(0, 9)]; // Keep last 10
        chrome.storage.local.set({ qrHistory: updatedHistory });
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const filename = `qr-code-${Date.now()}.png`;
    downloadFile(qrDataUrl, filename);
  };

  const handleCopy = async () => {
    if (!qrDataUrl) return;
    
    try {
      // Convert data URL to blob
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      // Show success feedback
      const button = document.getElementById('copy-btn');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: copy the URL
      navigator.clipboard.writeText(currentTab?.url || '');
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <QrCode className="w-6 h-6 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-800">QR Super Generator</h1>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <History className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Current Page Info */}
      {currentTab && (
        <div className="bg-white p-4 rounded-lg border mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm mb-1">Current Page</h3>
              <p className="text-xs text-gray-600 truncate" title={currentTab.title}>
                {currentTab.title}
              </p>
              <p className="text-xs text-gray-500 truncate" title={currentTab.url}>
                {currentTab.url}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleGenerateQR()}
            disabled={isGenerating}
            className="w-full mt-3 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isGenerating ? 'Generating...' : 'Generate QR Code'}
          </button>
        </div>
      )}

      {/* Custom Text Input */}
      <div className="bg-white p-4 rounded-lg border mb-4">
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-900">Custom Text/URL</span>
          <span className="text-xs text-gray-500">
            {showCustomInput ? 'Hide' : 'Show'}
          </span>
        </button>
        
        {showCustomInput && (
          <div className="mt-3">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text or URL..."
              className="w-full p-3 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => handleGenerateQR(customText)}
              disabled={!customText.trim() || isGenerating}
              className="w-full mt-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Generate Custom QR
            </button>
          </div>
        )}
      </div>

      {/* QR Code Display */}
      {qrDataUrl && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex flex-col items-center">
            <img
              src={qrDataUrl}
              alt="Generated QR Code"
              className="w-48 h-48 border rounded-lg mb-4"
            />
            
            <div className="flex space-x-2 w-full">
              <button
                id="copy-btn"
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
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Press Ctrl+Shift+Q (Cmd+Shift+Q on Mac) for quick QR generation
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