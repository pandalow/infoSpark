// Popup JavaScript functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize popup
  await initializePopup();
  
  // Add event listeners
  setupEventListeners();
  
  // Load saved settings
  await loadSettings();
});

async function initializePopup() {
  try {
    // Get current tab information
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      document.getElementById('current-url').textContent = tab.url;
      document.getElementById('page-title').textContent = tab.title;
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    document.getElementById('current-url').textContent = 'Unable to get URL';
    document.getElementById('page-title').textContent = 'Unable to get title';
  }
}

function setupEventListeners() {
  // Highlight button
  document.getElementById('highlight-btn').addEventListener('click', highlightText);
  
  // Count words button
  document.getElementById('count-words-btn').addEventListener('click', countWords);
  
  // Extract links button
  document.getElementById('extract-links-btn').addEventListener('click', extractLinks);
  
  // Auto-highlight checkbox
  document.getElementById('auto-highlight').addEventListener('change', saveSettings);
  
  // Options button
  document.getElementById('options-btn').addEventListener('click', openOptions);
}

async function highlightText() {
  showResult('Highlighting text on page...', 'loading');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: highlightPageText
    });
    
    showResult('Text highlighted successfully!', 'success');
  } catch (error) {
    console.error('Error highlighting text:', error);
    showResult('Error highlighting text', 'error');
  }
}

async function countWords() {
  showResult('Counting words on page...', 'loading');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: countPageWords
    });
    
    const wordCount = results[0].result;
    showResult(`Word count: ${wordCount} words`, 'success');
  } catch (error) {
    console.error('Error counting words:', error);
    showResult('Error counting words', 'error');
  }
}

async function extractLinks() {
  showResult('Extracting links from page...', 'loading');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageLinks
    });
    
    const links = results[0].result;
    showResult(`Found ${links.length} links:\n${links.slice(0, 5).join('\n')}${links.length > 5 ? '\n...' : ''}`, 'success');
  } catch (error) {
    console.error('Error extracting links:', error);
    showResult('Error extracting links', 'error');
  }
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['autoHighlight']);
    document.getElementById('auto-highlight').checked = result.autoHighlight || false;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const autoHighlight = document.getElementById('auto-highlight').checked;
    await chrome.storage.sync.set({ autoHighlight });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function showResult(message, type = '') {
  const resultArea = document.getElementById('result-area');
  resultArea.textContent = message;
  resultArea.className = `result-area show ${type}`;
  
  // Hide after 5 seconds for non-permanent messages
  if (type !== 'success') {
    setTimeout(() => {
      resultArea.classList.remove('show');
    }, 5000);
  }
}

// Content script functions (these will be injected into the page)
function highlightPageText() {
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.parentNode.tagName !== 'SCRIPT' && node.parentNode.tagName !== 'STYLE') {
      textNodes.push(node);
    }
  }
  
  textNodes.forEach(node => {
    if (node.textContent.trim().length > 10) {
      const span = document.createElement('span');
      span.style.backgroundColor = 'yellow';
      span.style.padding = '2px 4px';
      span.style.borderRadius = '3px';
      span.textContent = node.textContent;
      node.parentNode.replaceChild(span, node);
    }
  });
  
  return textNodes.length;
}

function countPageWords() {
  const text = document.body.innerText || document.body.textContent || '';
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

function extractPageLinks() {
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(link => link.href)
    .filter(href => href.startsWith('http'))
    .slice(0, 10); // Limit to first 10 links
  return links;
}