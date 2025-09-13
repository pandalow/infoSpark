// Options Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options page loaded');
  
  // Initialize the options page
  initializeOptions();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load saved settings
  loadSettings();
});

function initializeOptions() {
  // Set up range input display
  const analysisDelayRange = document.getElementById('analysis-delay');
  const analysisDelayValue = document.getElementById('analysis-delay-value');
  
  analysisDelayRange.addEventListener('input', (e) => {
    analysisDelayValue.textContent = e.target.value;
  });
}

function setupEventListeners() {
  // Save settings button
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  
  // Export settings button
  document.getElementById('export-settings').addEventListener('click', exportSettings);
  
  // Import settings button
  document.getElementById('import-settings').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  
  // Import file input
  document.getElementById('import-file').addEventListener('change', importSettings);
  
  // Reset settings button
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // Help link
  document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });
  
  // Feedback link
  document.getElementById('feedback-link').addEventListener('click', (e) => {
    e.preventDefault();
    openFeedback();
  });
  
  // Privacy link
  document.getElementById('privacy-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPrivacyInfo();
  });
  
  // Auto-save on certain changes
  const autoSaveElements = [
    'auto-highlight',
    'auto-analysis',
    'show-notifications',
    'theme-select',
    'case-sensitive',
    'debug-mode'
  ];
  
  autoSaveElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        saveSettings(false); // Don't show save message for auto-save
      });
    }
  });
}

async function loadSettings() {
  try {
    showSaveStatus('Loading settings...', 'saving');
    
    const settings = await chrome.storage.sync.get([
      'autoHighlight',
      'autoAnalysis',
      'showNotifications',
      'theme',
      'highlightColor',
      'keywordList',
      'caseSensitive',
      'analysisDelay',
      'debugMode'
    ]);
    
    // Apply loaded settings to form
    document.getElementById('auto-highlight').checked = settings.autoHighlight || false;
    document.getElementById('auto-analysis').checked = settings.autoAnalysis || false;
    document.getElementById('show-notifications').checked = settings.showNotifications !== false; // Default to true
    document.getElementById('theme-select').value = settings.theme || 'light';
    document.getElementById('highlight-color').value = settings.highlightColor || '#ffeb3b';
    document.getElementById('case-sensitive').checked = settings.caseSensitive || false;
    document.getElementById('analysis-delay').value = settings.analysisDelay || 2;
    document.getElementById('analysis-delay-value').textContent = settings.analysisDelay || 2;
    document.getElementById('debug-mode').checked = settings.debugMode || false;
    
    // Handle keyword list
    const keywordList = settings.keywordList || ['apply', 'job', 'career', 'hiring'];
    document.getElementById('keyword-list').value = keywordList.join(', ');
    
    showSaveStatus('Settings loaded successfully', 'success');
    setTimeout(() => {
      showSaveStatus('', '');
    }, 2000);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showSaveStatus('Error loading settings', 'error');
  }
}

async function saveSettings(showMessage = true) {
  try {
    if (showMessage) {
      showSaveStatus('Saving settings...', 'saving');
    }
    
    // Collect all settings from form
    const settings = {
      autoHighlight: document.getElementById('auto-highlight').checked,
      autoAnalysis: document.getElementById('auto-analysis').checked,
      showNotifications: document.getElementById('show-notifications').checked,
      theme: document.getElementById('theme-select').value,
      highlightColor: document.getElementById('highlight-color').value,
      caseSensitive: document.getElementById('case-sensitive').checked,
      analysisDelay: parseInt(document.getElementById('analysis-delay').value),
      debugMode: document.getElementById('debug-mode').checked
    };
    
    // Process keyword list
    const keywordText = document.getElementById('keyword-list').value;
    const keywordList = keywordText
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
    settings.keywordList = keywordList;
    
    // Save to Chrome storage
    await chrome.storage.sync.set(settings);
    
    if (showMessage) {
      showSaveStatus('Settings saved successfully!', 'success');
      setTimeout(() => {
        showSaveStatus('', '');
      }, 3000);
    }
    
    // Notify background script of settings change
    chrome.runtime.sendMessage({
      action: 'settingsUpdated',
      settings: settings
    });
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showSaveStatus('Error saving settings', 'error');
  }
}

function exportSettings() {
  chrome.storage.sync.get(null, (settings) => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'applyday-extension-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showSaveStatus('Settings exported successfully', 'success');
    
    setTimeout(() => {
      showSaveStatus('', '');
    }, 3000);
  });
}

function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      
      // Validate settings structure (basic validation)
      if (typeof settings !== 'object') {
        throw new Error('Invalid settings file format');
      }
      
      // Save imported settings
      await chrome.storage.sync.set(settings);
      
      // Reload the form with imported settings
      await loadSettings();
      
      showSaveStatus('Settings imported successfully!', 'success');
      
    } catch (error) {
      console.error('Error importing settings:', error);
      showSaveStatus('Error importing settings: Invalid file format', 'error');
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input
  event.target.value = '';
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
    return;
  }
  
  try {
    showSaveStatus('Resetting settings...', 'saving');
    
    // Clear all settings
    await chrome.storage.sync.clear();
    
    // Set default values
    const defaultSettings = {
      autoHighlight: false,
      autoAnalysis: false,
      showNotifications: true,
      theme: 'light',
      highlightColor: '#ffeb3b',
      keywordList: ['apply', 'job', 'career', 'hiring'],
      caseSensitive: false,
      analysisDelay: 2,
      debugMode: false
    };
    
    await chrome.storage.sync.set(defaultSettings);
    
    // Reload the form
    await loadSettings();
    
    showSaveStatus('Settings reset to defaults', 'success');
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    showSaveStatus('Error resetting settings', 'error');
  }
}

function showSaveStatus(message, type) {
  const statusElement = document.getElementById('save-status');
  statusElement.textContent = message;
  statusElement.className = `save-status ${type}`;
}

function showHelp() {
  const helpContent = `
ApplyDay Extension Help

FEATURES:
• Auto-highlight job-related keywords on web pages
• Analyze pages for job content and metrics
• Manual text highlighting with click mode
• Customizable keyword lists and colors
• Export/import settings for backup

USAGE:
1. Click the extension icon to open the popup
2. Use "Highlight Text" to highlight keywords on the current page
3. Use "Count Words" to get word statistics
4. Use "Extract Links" to find all links on the page
5. Enable auto-highlight in settings for automatic keyword highlighting

PERMISSIONS:
• Storage: Save your settings and preferences
• Active Tab: Interact with the current web page
• Scripting: Inject scripts for highlighting and analysis

SHORTCUTS:
• Right-click for context menu options
• Use toggle highlight mode for manual selection

For more help, please contact support.
  `;
  
  alert(helpContent);
}

function openFeedback() {
  const feedbackUrl = 'mailto:support@applyday.com?subject=ApplyDay Extension Feedback';
  window.open(feedbackUrl, '_blank');
}

function showPrivacyInfo() {
  const privacyContent = `
Privacy Information

ApplyDay Extension respects your privacy:

DATA COLLECTION:
• We do NOT collect personal information
• Settings are stored locally on your device
• No data is sent to external servers
• Page content is processed locally only

PERMISSIONS:
• Storage: Used only for saving your preferences
• Active Tab: Used only for page analysis and highlighting
• Scripting: Used only for highlighting and content analysis

DATA SHARING:
• We do NOT share any data with third parties
• All processing happens on your device
• No tracking or analytics are performed

Your privacy is important to us. This extension operates entirely on your device without sending data to external servers.
  `;
  
  alert(privacyContent);
}

// Apply theme changes immediately
document.getElementById('theme-select').addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (theme === 'auto') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// Add dark theme styles dynamically
const darkThemeCSS = `
.dark-theme {
  background: #1a1a1a !important;
  color: #e9ecef !important;
}

.dark-theme .header,
.dark-theme .settings-section,
.dark-theme .save-section,
.dark-theme .footer {
  background: #2d3748 !important;
  border-color: #4a5568 !important;
}

.dark-theme .select-input,
.dark-theme .textarea-input {
  background: #4a5568 !important;
  border-color: #718096 !important;
  color: #e9ecef !important;
}

.dark-theme .checkmark {
  background-color: #4a5568 !important;
  border-color: #718096 !important;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = darkThemeCSS;
document.head.appendChild(styleSheet);