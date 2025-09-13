// Content Script - Runs on all web pages
console.log('ApplyDay Extension content script loaded');

// Global variables
let isHighlightMode = false;
let highlightedElements = [];
let originalStyles = new Map();

// Initialize content script
(function() {
  'use strict';
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

function initialize() {
  console.log('Content script initialized on:', window.location.href);
  
  // Listen for messages from background script and popup
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Add extension indicator
  addExtensionIndicator();
  
  // Analyze page on load if auto-analysis is enabled
  checkAutoAnalysis();
}

function handleMessage(message, sender, sendResponse) {
  console.log('Content script received message:', message);
  
  switch (message.action) {
    case 'autoHighlight':
      performAutoHighlight();
      break;
      
    case 'highlightKeywords':
      highlightKeywords(message.keywords);
      break;
      
    case 'toggleHighlight':
      toggleHighlightMode();
      break;
      
    case 'quickAnalyze':
      performQuickAnalysis().then(results => {
        sendResponse({ success: true, results });
      });
      return true; // Will respond asynchronously
      
    case 'highlightSelection':
      highlightText(message.text);
      break;
      
    case 'analyzePage':
      performPageAnalysis().then(results => {
        sendResponse({ success: true, results });
      });
      return true;
      
    case 'clearHighlights':
      clearAllHighlights();
      break;
      
    default:
      console.log('Unknown message action:', message.action);
  }
}

async function performAutoHighlight() {
  try {
    // Get keyword list from storage
    const result = await chrome.storage.sync.get(['keywordList']);
    const keywords = result.keywordList || ['apply', 'job', 'career', 'hiring'];
    
    highlightKeywords(keywords);
  } catch (error) {
    console.error('Error in auto highlight:', error);
  }
}

function highlightKeywords(keywords) {
  if (!keywords || keywords.length === 0) return;
  
  clearAllHighlights();
  
  const bodyText = document.body.innerHTML;
  let modifiedText = bodyText;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    modifiedText = modifiedText.replace(regex, 
      `<span class="applyday-highlight" data-keyword="${keyword}">$1</span>`
    );
  });
  
  if (modifiedText !== bodyText) {
    document.body.innerHTML = modifiedText;
    addHighlightStyles();
    
    // Track highlighted elements
    highlightedElements = Array.from(document.querySelectorAll('.applyday-highlight'));
    console.log(`Highlighted ${highlightedElements.length} keyword instances`);
  }
}

function highlightText(text) {
  if (!text) return;
  
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  
  if (range) {
    const span = document.createElement('span');
    span.className = 'applyday-highlight applyday-manual-highlight';
    span.textContent = text;
    
    range.deleteContents();
    range.insertNode(span);
    
    highlightedElements.push(span);
    addHighlightStyles();
  }
}

function toggleHighlightMode() {
  isHighlightMode = !isHighlightMode;
  
  if (isHighlightMode) {
    document.body.style.cursor = 'crosshair';
    document.addEventListener('click', handleHighlightClick, true);
    showTemporaryMessage('Highlight mode ON - Click text to highlight');
  } else {
    document.body.style.cursor = '';
    document.removeEventListener('click', handleHighlightClick, true);
    showTemporaryMessage('Highlight mode OFF');
  }
}

function handleHighlightClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const element = event.target;
  if (element && element.textContent.trim()) {
    highlightElement(element);
  }
}

function highlightElement(element) {
  if (element.classList.contains('applyday-highlight')) {
    // Remove highlight
    element.outerHTML = element.textContent;
  } else {
    // Add highlight
    if (!originalStyles.has(element)) {
      originalStyles.set(element, element.style.backgroundColor);
    }
    
    element.style.backgroundColor = '#ffeb3b';
    element.style.padding = '2px 4px';
    element.style.borderRadius = '3px';
    element.classList.add('applyday-highlight');
    
    highlightedElements.push(element);
  }
  
  addHighlightStyles();
}

function clearAllHighlights() {
  // Remove all highlight spans
  const highlights = document.querySelectorAll('.applyday-highlight');
  highlights.forEach(highlight => {
    highlight.outerHTML = highlight.textContent;
  });
  
  // Restore original styles
  originalStyles.forEach((originalStyle, element) => {
    if (element && element.style) {
      element.style.backgroundColor = originalStyle;
    }
  });
  
  highlightedElements = [];
  originalStyles.clear();
  
  console.log('All highlights cleared');
}

async function performQuickAnalysis() {
  const analysis = {
    url: window.location.href,
    title: document.title,
    wordCount: countWords(),
    linkCount: document.querySelectorAll('a[href]').length,
    imageCount: document.querySelectorAll('img').length,
    headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    formCount: document.querySelectorAll('form').length,
    timestamp: new Date().toISOString()
  };
  
  // Send results to background script
  chrome.runtime.sendMessage({
    action: 'pageAnalyzed',
    data: analysis
  });
  
  return analysis;
}

async function performPageAnalysis() {
  const analysis = await performQuickAnalysis();
  
  // Extended analysis
  analysis.metaDescription = getMetaDescription();
  analysis.lang = document.documentElement.lang || 'unknown';
  analysis.hasJobKeywords = checkJobKeywords();
  analysis.socialLinks = getSocialLinks();
  analysis.emailAddresses = extractEmailAddresses();
  
  showTemporaryMessage('Page analysis complete!');
  
  return analysis;
}

function countWords() {
  const text = document.body.innerText || document.body.textContent || '';
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function getMetaDescription() {
  const metaDesc = document.querySelector('meta[name="description"]');
  return metaDesc ? metaDesc.content : '';
}

function checkJobKeywords() {
  const text = document.body.textContent.toLowerCase();
  const jobKeywords = ['job', 'career', 'hiring', 'apply', 'position', 'employment', 'work', 'opportunity'];
  return jobKeywords.some(keyword => text.includes(keyword));
}

function getSocialLinks() {
  const socialDomains = ['twitter.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
  const links = Array.from(document.querySelectorAll('a[href]'));
  
  return links
    .map(link => link.href)
    .filter(href => socialDomains.some(domain => href.includes(domain)))
    .slice(0, 5);
}

function extractEmailAddresses() {
  const text = document.body.textContent;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];
  return [...new Set(emails)].slice(0, 5); // Remove duplicates and limit
}

function addExtensionIndicator() {
  // Add a small indicator that the extension is active
  const indicator = document.createElement('div');
  indicator.id = 'applyday-extension-indicator';
  indicator.textContent = 'AD';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    z-index: 10000;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  
  indicator.addEventListener('click', () => {
    showTemporaryMessage('ApplyDay Extension is active!');
  });
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.transform = 'scale(1.1)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(indicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0.3';
  }, 3000);
}

function addHighlightStyles() {
  if (document.getElementById('applyday-highlight-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'applyday-highlight-styles';
  style.textContent = `
    .applyday-highlight {
      background-color: #ffeb3b !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
      transition: all 0.2s ease !important;
    }
    
    .applyday-highlight:hover {
      background-color: #ffc107 !important;
      transform: scale(1.05) !important;
    }
    
    .applyday-manual-highlight {
      background-color: #4caf50 !important;
    }
    
    .applyday-manual-highlight:hover {
      background-color: #45a049 !important;
    }
  `;
  
  document.head.appendChild(style);
}

function showTemporaryMessage(text, duration = 3000) {
  // Remove existing message
  const existing = document.getElementById('applyday-temp-message');
  if (existing) existing.remove();
  
  const message = document.createElement('div');
  message.id = 'applyday-temp-message';
  message.textContent = text;
  message.style.cssText = `
    position: fixed;
    top: 50px;
    right: 10px;
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  
  // Add animation
  const keyframes = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  
  if (!document.getElementById('applyday-animations')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'applyday-animations';
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);
  }
  
  document.body.appendChild(message);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (message && message.parentNode) {
      message.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => message.remove(), 300);
    }
  }, duration);
}

async function checkAutoAnalysis() {
  try {
    const result = await chrome.storage.sync.get(['autoAnalysis']);
    if (result.autoAnalysis) {
      setTimeout(() => {
        performQuickAnalysis();
      }, 2000); // Wait 2 seconds for page to fully load
    }
  } catch (error) {
    console.error('Error checking auto analysis:', error);
  }
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  clearAllHighlights();
});