/**
 * Content Script for QR Super Generator
 * Handles minimal page interactions and clipboard operations
 */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.action) {
    case 'copyToClipboard':
      handleCopyToClipboard(message.text)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'getPageInfo':
      const pageInfo = getPageInfo();
      sendResponse({ success: true, data: pageInfo });
      return false;
      
    case 'highlightElement':
      highlightElement(message.selector)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

/**
 * Copy text to clipboard using the modern Clipboard API
 */
async function handleCopyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use the modern Clipboard API if available and in secure context
      await navigator.clipboard.writeText(text);
      showCopyNotification('Text copied to clipboard');
    } else {
      // Fallback for older browsers or non-secure contexts
      await fallbackCopyToClipboard(text);
      showCopyNotification('Text copied to clipboard');
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

/**
 * Fallback clipboard copy method for older browsers
 */
async function fallbackCopyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        resolve();
      } else {
        reject(new Error('Copy command failed'));
      }
    } catch (error) {
      document.body.removeChild(textArea);
      reject(error);
    }
  });
}

/**
 * Show a temporary notification for successful copy operation
 */
function showCopyNotification(message: string): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(-10px);
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

/**
 * Get useful page information for QR code generation
 */
function getPageInfo(): any {
  return {
    url: window.location.href,
    title: document.title,
    description: getMetaContent('description'),
    keywords: getMetaContent('keywords'),
    author: getMetaContent('author'),
    canonicalUrl: getCanonicalUrl(),
    socialImage: getSocialImage(),
    pageText: getPageText(),
    selection: getSelectedText()
  };
}

/**
 * Get meta tag content by name
 */
function getMetaContent(name: string): string | null {
  const metaTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  return metaTag ? metaTag.content : null;
}

/**
 * Get canonical URL from link tag
 */
function getCanonicalUrl(): string | null {
  const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  return canonicalLink ? canonicalLink.href : null;
}

/**
 * Get social media image (Open Graph or Twitter Card)
 */
function getSocialImage(): string | null {
  const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
  if (ogImage) return ogImage.content;
  
  const twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement;
  return twitterImage ? twitterImage.content : null;
}

/**
 * Get the main text content of the page (first 500 characters)
 */
function getPageText(): string {
  const mainContent = document.querySelector('main, article, .content, #content, .post, .entry');
  const textContent = mainContent ? mainContent.textContent : document.body.textContent;
  return textContent ? textContent.trim().substring(0, 500) : '';
}

/**
 * Get currently selected text
 */
function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

/**
 * Highlight an element on the page (for potential future features)
 */
async function highlightElement(selector: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        reject(new Error('Element not found'));
        return;
      }
      
      // Add highlight styling
      const originalOutline = (element as HTMLElement).style.outline;
      const originalBackground = (element as HTMLElement).style.backgroundColor;
      
      (element as HTMLElement).style.outline = '3px solid #3b82f6';
      (element as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        (element as HTMLElement).style.outline = originalOutline;
        (element as HTMLElement).style.backgroundColor = originalBackground;
        resolve();
      }, 2000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extract all links from the page (for potential batch QR generation)
 */
function extractAllLinks(): Array<{ url: string; text: string }> {
  const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  return links
    .filter(link => {
      const href = link.href;
      return href && 
             !href.startsWith('javascript:') && 
             !href.startsWith('mailto:') && 
             !href.startsWith('tel:') &&
             !href.startsWith('#');
    })
    .map(link => ({
      url: link.href,
      text: link.textContent?.trim() || link.href
    }))
    .slice(0, 50); // Limit to first 50 links
}

/**
 * Extract email addresses from the page
 */
function extractEmailAddresses(): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const pageText = document.body.textContent || '';
  const emails = pageText.match(emailRegex) || [];
  return [...new Set(emails)]; // Remove duplicates
}

/**
 * Extract phone numbers from the page
 */
function extractPhoneNumbers(): string[] {
  const phoneRegex = /(\+?1?[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)[0-9]{3}[-.\s]?[0-9]{4}/g;
  const pageText = document.body.textContent || '';
  const phones = pageText.match(phoneRegex) || [];
  return [...new Set(phones)]; // Remove duplicates
}

// Initialize content script
console.log('QR Super Generator content script loaded on:', window.location.href);

// Listen for keyboard shortcuts that might need page interaction
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+Q or Cmd+Shift+Q
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Q') {
    event.preventDefault();
    
    // Send message to background script that shortcut was triggered on this page
    chrome.runtime.sendMessage({
      action: 'shortcutTriggered',
      data: {
        url: window.location.href,
        title: document.title,
        selectedText: getSelectedText()
      }
    });
  }
});

// Export functions for potential use by other scripts
(window as any).qrSuperGenerator = {
  getPageInfo,
  extractAllLinks,
  extractEmailAddresses,
  extractPhoneNumbers,
  copyToClipboard: handleCopyToClipboard
}; 