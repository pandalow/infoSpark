// Copilot Web Storage Utilities
class StorageManager {
  constructor() {
    this.defaultSettings = {
      contextRules: '',
      isEnabled: true,
      enableGhostText: true,
      completionSettings: {
        maxTokens: 100,
        temperature: 0.3,
        debounceMs: 500
      },
      chatHistory: [],
      userPreferences: {
        theme: 'auto',
        language: 'zh-CN'
      }
    };
  }

  /**
   * Get a value from storage with fallback to defaults
   * @param {string|string[]} keys - Key(s) to retrieve
   * @returns {Promise<any>} Storage value(s)
   */
  async get(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      
      // Handle single key
      if (typeof keys === 'string') {
        return result[keys] !== undefined ? result[keys] : this.defaultSettings[keys];
      }
      
      // Handle multiple keys
      if (Array.isArray(keys)) {
        const merged = {};
        keys.forEach(key => {
          merged[key] = result[key] !== undefined ? result[key] : this.defaultSettings[key];
        });
        return merged;
      }
      
      return result;
    } catch (error) {
      console.error('Storage get error:', error);
      return typeof keys === 'string' ? this.defaultSettings[keys] : {};
    }
  }

  /**
   * Set value(s) in storage
   * @param {object} items - Key-value pairs to store
   * @returns {Promise<boolean>} Success status
   */
  async set(items) {
    try {
      await chrome.storage.local.set(items);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Remove key(s) from storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<boolean>} Success status
   */
  async remove(keys) {
    try {
      await chrome.storage.local.remove(keys);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * Clear all storage data
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Get all storage data
   * @returns {Promise<object>} All stored data
   */
  async getAll() {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      console.error('Storage getAll error:', error);
      return {};
    }
  }

  /**
   * Initialize storage with default values
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      const existing = await chrome.storage.local.get(null);
      const toSet = {};
      
      // Only set defaults for missing keys
      Object.keys(this.defaultSettings).forEach(key => {
        if (existing[key] === undefined) {
          toSet[key] = this.defaultSettings[key];
        }
      });
      
      if (Object.keys(toSet).length > 0) {
        await chrome.storage.local.set(toSet);
      }
      
      return true;
    } catch (error) {
      console.error('Storage initialization error:', error);
      return false;
    }
  }

  /**
   * Update specific settings
   * @param {object} updates - Settings to update
   * @returns {Promise<boolean>} Success status
   */
  async updateSettings(updates) {
    try {
      const current = await this.get(Object.keys(updates));
      const merged = { ...current, ...updates };
      return await this.set(merged);
    } catch (error) {
      console.error('Settings update error:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Promise<object>} Usage stats
   */
  async getUsageInfo() {
    try {
      const data = await chrome.storage.local.get(null);
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        bytesUsed: usage,
        quotaBytes: quota,
        percentageUsed: Math.round((usage / quota) * 100),
        itemCount: Object.keys(data).length
      };
    } catch (error) {
      console.error('Usage info error:', error);
      return {
        bytesUsed: 0,
        quotaBytes: 0,
        percentageUsed: 0,
        itemCount: 0
      };
    }
  }
}

// Message passing utilities
class MessageManager {
  constructor() {
    this.listeners = new Map();
    this.requestId = 0;
  }

  /**
   * Send message to background script
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @returns {Promise<any>} Response
   */
  async sendToBackground(type, data = null) {
    try {
      const response = await chrome.runtime.sendMessage({
        type,
        data,
        requestId: ++this.requestId,
        timestamp: Date.now()
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Message error (${type}):`, error);
      throw error;
    }
  }

  /**
   * Send message to content script
   * @param {number} tabId - Target tab ID
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @returns {Promise<any>} Response
   */
  async sendToContent(tabId, type, data = null) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type,
        data,
        requestId: ++this.requestId,
        timestamp: Date.now()
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      console.error(`Content message error (${type}):`, error);
      throw error;
    }
  }

  /**
   * Add message listener
   * @param {string} type - Message type to listen for
   * @param {function} handler - Handler function
   */
  addListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  /**
   * Remove message listener
   * @param {string} type - Message type
   * @param {function} handler - Handler function to remove
   */
  removeListener(type, handler) {
    if (this.listeners.has(type)) {
      const handlers = this.listeners.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming messages
   * @param {object} message - Received message
   * @param {object} sender - Message sender
   * @param {function} sendResponse - Response function
   */
  handleMessage(message, sender, sendResponse) {
    const { type, data } = message;
    
    if (this.listeners.has(type)) {
      const handlers = this.listeners.get(type);
      handlers.forEach(handler => {
        try {
          const result = handler(data, sender);
          
          // Handle async responses
          if (result instanceof Promise) {
            result
              .then(response => sendResponse({ success: true, data: response }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open
          } else if (result !== undefined) {
            sendResponse({ success: true, data: result });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      });
    } else {
      sendResponse({ success: false, error: 'Unknown message type' });
    }
  }
}

// Utility functions
class Utils {
  /**
   * Debounce function calls
   * @param {function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {function} Debounced function
   */
  static debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle function calls
   * @param {function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Format timestamp to readable string
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted time string
   */
  static formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if element is visible in viewport
   * @param {Element} element - Element to check
   * @returns {boolean} Visibility status
   */
  static isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Get element position relative to document
   * @param {Element} element - Target element
   * @returns {object} Position coordinates
   */
  static getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      right: rect.right + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard copy error:', error);
      return false;
    }
  }

  /**
   * Download text as file
   * @param {string} content - File content
   * @param {string} filename - File name
   * @param {string} type - MIME type
   */
  static downloadAsFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, MessageManager, Utils };
} else if (typeof window !== 'undefined') {
  window.CopilotUtils = { StorageManager, MessageManager, Utils };
}