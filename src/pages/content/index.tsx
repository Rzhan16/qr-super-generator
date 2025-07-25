/**
 * QR Super Generator - Content Script
 * 
 * Automatically generates and displays QR codes for websites
 * with floating widget and smart detection capabilities
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QrCode, X, Copy, Download, Minimize2, Maximize2 } from 'lucide-react';
import QRCode from 'qrcode';
import './style.css';

interface QRWidgetState {
  visible: boolean;
  minimized: boolean;
  qrDataUrl: string | null;
  currentUrl: string;
  isGenerating: boolean;
  error: string | null;
}

function QRWidget() {
  const [state, setState] = useState<QRWidgetState>({
    visible: false,
    minimized: false,
    qrDataUrl: null,
    currentUrl: '',
    isGenerating: false,
    error: null
  });

  useEffect(() => {
    console.log('🚀 QR Super Generator content script loaded');
    
    // Check if auto-generation is enabled
    checkAutoGenerationSettings();
    
    // Listen for URL changes (SPA navigation)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange(currentUrl);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Listen for messages from extension
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      observer.disconnect();
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const checkAutoGenerationSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['autoGenerate', 'showWidget']);
      if (result.autoGenerate !== false && result.showWidget !== false) {
        generateQRForCurrentPage();
      }
    } catch (error) {
      console.warn('Could not check auto-generation settings:', error);
    }
  };

  const handleUrlChange = (url: string) => {
    console.log('📄 URL changed:', url);
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setState(prev => ({ ...prev, currentUrl: url }));
      generateQRForCurrentPage();
    }
  };

  const handleMessage = (message: any, sender: any, sendResponse: any) => {
    console.log('📨 Content script received message:', message);
    
    switch (message.type) {
      case 'GENERATE_QR':
      case 'AUTO_GENERATE_QR':
        generateQRCode(message.text || window.location.href);
        break;
      case 'SHOW_WIDGET':
        setState(prev => ({ ...prev, visible: true }));
        break;
      case 'HIDE_WIDGET':
        setState(prev => ({ ...prev, visible: false }));
        break;
      case 'TOGGLE_WIDGET':
        setState(prev => ({ ...prev, visible: !prev.visible }));
        break;
      default:
        console.debug('Unknown message type:', message.type);
    }
  };

  const generateQRForCurrentPage = () => {
    const url = window.location.href;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      generateQRCode(url);
    }
  };

  // Fire-and-forget history storage helper - errors here don't affect user-facing QR generation
  const storeQrDataInHistory = (qrData: any) => {
    // Check if chrome.runtime is available
    if (!chrome?.runtime) {
      console.debug('Chrome runtime not available for history storage');
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: 'STORE_QR_DATA',
        qrData
      }).catch((error: any) => {
        // Completely ignore all storage errors - they are non-critical
        console.debug('History storage failed (non-critical):', error?.message || 'Unknown error');
      });
    } catch (error) {
      // Completely ignore all storage errors - they are non-critical
      console.debug('History storage error (non-critical):', error);
    }
  };

  const generateQRCode = async (text: string) => {
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: null,
      visible: true,
      currentUrl: text
    }));

    try {
      console.log('🎯 Generating QR code locally for:', text.substring(0, 50) + '...');

      // Generate QR code locally using QRCode library
      const qrOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#9333ea',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M' as const
      };

      const dataUrl = await QRCode.toDataURL(text, qrOptions);

      // QR Generation completed successfully - update UI immediately
      setState(prev => ({
        ...prev,
        qrDataUrl: dataUrl,
        isGenerating: false
      }));

      console.log('✅ QR code generated successfully');

      // Store in history - FIRE AND FORGET (completely separate from QR generation success)
      const qrData = {
        text,
        dataUrl,
        timestamp: Date.now(),
        id: Date.now().toString(),
        type: text.startsWith('http') ? 'url' : 'text'
      };
      
      storeQrDataInHistory(qrData);

    } catch (error) {
      console.error('❌ QR generation failed:', error);
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isGenerating: false
      }));
    }
  };

  const handleCopyQR = async () => {
    if (!state.qrDataUrl) return;

    try {
      const response = await fetch(state.qrDataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      console.log('✅ QR code copied to clipboard');
      showNotification('QR code copied to clipboard!');
    } catch (error) {
      console.error('❌ Failed to copy QR code:', error);
      // Fallback: copy URL
      try {
        await navigator.clipboard.writeText(state.currentUrl);
        showNotification('URL copied to clipboard!');
      } catch (fallbackError) {
        console.error('❌ Failed to copy URL:', fallbackError);
      }
    }
  };

  const handleDownloadQR = () => {
    if (!state.qrDataUrl) return;

    try {
      const link = document.createElement('a');
      link.href = state.qrDataUrl;
      link.download = `qr-${window.location.hostname}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ QR code download initiated');
      showNotification('QR code downloaded!');
    } catch (error) {
      console.error('❌ Failed to download QR code:', error);
    }
  };

  const showNotification = (message: string) => {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'qr-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  if (!state.visible) {
    return null;
  }

  return (
    <div className={`qr-widget ${state.minimized ? 'minimized' : ''}`}>
      <div className="qr-widget-header">
        <div className="qr-widget-title">
          <QrCode size={16} />
          <span>QR Code</span>
        </div>
        <div className="qr-widget-controls">
          <button
            onClick={() => setState(prev => ({ ...prev, minimized: !prev.minimized }))}
            className="qr-widget-btn"
            title={state.minimized ? 'Expand' : 'Minimize'}
          >
            {state.minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, visible: false }))}
            className="qr-widget-btn"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!state.minimized && (
        <div className="qr-widget-content">
          {state.isGenerating ? (
            <div className="qr-widget-loading">
              <div className="qr-spinner"></div>
              <p>Generating QR code...</p>
            </div>
          ) : state.error ? (
            <div className="qr-widget-error">
              <p>Failed to generate QR code</p>
              <button 
                onClick={() => generateQRCode(state.currentUrl)}
                className="qr-retry-btn"
              >
                Retry
              </button>
            </div>
          ) : state.qrDataUrl ? (
            <div className="qr-widget-display">
              <div className="qr-image-container">
                <img src={state.qrDataUrl} alt="QR Code" className="qr-image" />
              </div>
              <div className="qr-url">
                <p title={state.currentUrl}>
                  {state.currentUrl.length > 30 
                    ? state.currentUrl.substring(0, 30) + '...' 
                    : state.currentUrl
                  }
                </p>
              </div>
              <div className="qr-actions">
                <button onClick={handleCopyQR} className="qr-action-btn">
                  <Copy size={14} />
                  Copy
                </button>
                <button onClick={handleDownloadQR} className="qr-action-btn">
                  <Download size={14} />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="qr-widget-empty">
              <p>No QR code generated</p>
              <button 
                onClick={generateQRForCurrentPage}
                className="qr-generate-btn"
              >
                Generate QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Initialize the widget
function initializeQRWidget() {
  // Check if we're in a valid context
  if (window.location.protocol === 'chrome-extension:' || 
      window.location.protocol === 'moz-extension:' ||
      window.location.hostname === '') {
    return;
  }

  console.log('🔧 Initializing QR widget for:', window.location.href);

  // Create container for the widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'qr-super-generator-widget';
  widgetContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Wait for document to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(widgetContainer);
    });
  } else {
    document.body.appendChild(widgetContainer);
  }

  // Render the React component
  const root = createRoot(widgetContainer);
  root.render(<QRWidget />);

  console.log('✅ QR widget initialized');
}

// Initialize when script loads
try {
  initializeQRWidget();
} catch (error) {
  console.error('❌ Failed to initialize QR widget:', error);
}
