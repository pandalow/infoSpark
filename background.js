// Background Service Worker
console.log('ApplyDay Extension background script loaded');

// Extension installation/update handlers
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details);
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      autoHighlight: false,
      theme: 'light',
      keywordList: ['apply', 'job', 'career', 'hiring']
    });
    
    // Show welcome message
    showNotification('Welcome to ApplyDay Extension!', 'Extension installed successfully');
  } else if (details.reason === 'update') {
    showNotification('Extension Updated', 'ApplyDay Extension has been updated to the latest version');
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message, 'from:', sender);
  
  switch (message.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Will respond asynchronously
      
    case 'saveSettings':
      handleSaveSettings(message.settings, sendResponse);
      return true;
      
    case 'highlightKeywords':
      handleHighlightKeywords(sender.tab.id, message.keywords);
      break;
      
    case 'pageAnalyzed':
      handlePageAnalyzed(message.data, sender.tab.id);
      break;
      
    default:
      console.log('Unknown message action:', message.action);
  }
});

// Handle tab updates (page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    
    // Check if auto-highlighting is enabled
    chrome.storage.sync.get(['autoHighlight'], (result) => {
      if (result.autoHighlight) {
        // Send message to content script to auto-highlight
        chrome.tabs.sendMessage(tabId, {
          action: 'autoHighlight'
        }).catch(error => {
          // Ignore errors for pages where content script isn't injected
          console.log('Could not send message to tab:', error);
        });
      }
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  switch (command) {
    case 'toggle-highlight':
      toggleHighlight();
      break;
    case 'quick-analyze':
      quickAnalyze();
      break;
  }
});

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'highlight-selection',
    title: 'Highlight selected text',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'analyze-page',
    title: 'Analyze this page',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['page', 'selection']
  });
  
  chrome.contextMenus.create({
    id: 'open-options',
    title: 'ApplyDay Options',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'highlight-selection':
      highlightSelection(tab.id, info.selectionText);
      break;
    case 'analyze-page':
      analyzePage(tab.id);
      break;
    case 'open-options':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// Utility functions
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'autoHighlight',
      'theme',
      'keywordList'
    ]);
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set(settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleHighlightKeywords(tabId, keywords) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'highlightKeywords',
      keywords: keywords
    });
  } catch (error) {
    console.error('Error sending highlight message:', error);
  }
}

function handlePageAnalyzed(data, tabId) {
  console.log('Page analysis results:', data);
  
  // Store analysis results
  chrome.storage.local.set({
    [`analysis_${tabId}`]: {
      ...data,
      timestamp: Date.now()
    }
  });
}

async function toggleHighlight() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlight' });
  } catch (error) {
    console.error('Error toggling highlight:', error);
  }
}

async function quickAnalyze() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'quickAnalyze' });
    showNotification('Page Analysis', 'Analyzing current page...');
  } catch (error) {
    console.error('Error performing quick analysis:', error);
  }
}

async function highlightSelection(tabId, selectedText) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'highlightSelection',
      text: selectedText
    });
  } catch (error) {
    console.error('Error highlighting selection:', error);
  }
}

async function analyzePage(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'analyzePage' });
    showNotification('Page Analysis', 'Starting page analysis...');
  } catch (error) {
    console.error('Error analyzing page:', error);
  }
}

function showNotification(title, message) {
  // Check if notifications are supported
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message
    });
  } else {
    console.log(`Notification: ${title} - ${message}`);
  }
}

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension is being unloaded');
});