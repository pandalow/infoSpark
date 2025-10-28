// src/chromeMessaging.js
export const chromeMessaging = {
  async sendMessage(type, data) {
    try {
      const response = await chrome.runtime.sendMessage({ type, data });
      
      if (response && response.success) {
        return response.data;
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Chrome messaging error (${type}):`, error);
      throw error;
    }
  },

  async getStorage(key) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async setStorage(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  async chatWithAI(message, chatHistory) {
    return this.sendMessage('CHAT_WITH_AI', { message, chatHistory });
  }
};