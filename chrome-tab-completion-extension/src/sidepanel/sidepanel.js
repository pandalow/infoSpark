// Copilot Web Side Panel JavaScript
class SidePanel {
  constructor() {
    this.chatHistory = [];
    this.isAIReady = false;
    
    this.init();
  }

  init() {
    console.log('Side panel initialized');
    
    // Get DOM elements
    this.elements = {
      aiStatus: document.getElementById('aiStatus'),
      contextRules: document.getElementById('contextRules'),
      saveRules: document.getElementById('saveRules'),
      chatMessages: document.getElementById('chatMessages'),
      chatInput: document.getElementById('chatInput'),
      sendMessage: document.getElementById('sendMessage'),
      enableCompletion: document.getElementById('enableCompletion'),
      enableGhostText: document.getElementById('enableGhostText'),
      clearChat: document.getElementById('clearChat'),
      exportChat: document.getElementById('exportChat'),
      diagnosticInfo: document.getElementById('diagnosticInfo'),
      refreshDiagnostic: document.getElementById('refreshDiagnostic')
    };

    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    this.loadSettings();
    this.checkAIStatus();
    this.loadChatHistory();
    
    // Run initial diagnostic
    this.runDiagnostic();
  }

  setupEventListeners() {
    // Context rules
    this.elements.saveRules.addEventListener('click', () => this.saveContextRules());
    
    // Chat functionality
    this.elements.sendMessage.addEventListener('click', () => this.sendMessage());
    this.elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.elements.chatInput.addEventListener('input', () => {
      this.elements.sendMessage.disabled = !this.elements.chatInput.value.trim();
    });

    // Settings
    this.elements.enableCompletion.addEventListener('change', () => this.saveSettings());
    this.elements.enableGhostText.addEventListener('change', () => this.saveSettings());
    
    // Footer actions
    this.elements.clearChat.addEventListener('click', () => this.clearChatHistory());
    this.elements.exportChat.addEventListener('click', () => this.exportChatHistory());
    
    // Diagnostic
    this.elements.refreshDiagnostic.addEventListener('click', () => this.runDiagnostic());
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'contextRules', 
        'enableCompletion', 
        'enableGhostText',
        'chatHistory'
      ]);
      
      this.elements.contextRules.value = result.contextRules || '';
      this.elements.enableCompletion.checked = result.enableCompletion !== false;
      this.elements.enableGhostText.checked = result.enableGhostText !== false;
      
      if (result.chatHistory) {
        this.chatHistory = result.chatHistory;
        this.renderChatHistory();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        enableCompletion: this.elements.enableCompletion.checked,
        enableGhostText: this.elements.enableGhostText.checked
      });
      
      this.showToast('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('保存设置失败', 'error');
    }
  }

  async saveContextRules() {
    try {
      const contextRules = this.elements.contextRules.value.trim();
      
      const response = await chrome.runtime.sendMessage({
        type: 'SET_CONTEXT_RULES',
        data: { contextRules }
      });

      if (response.success) {
        this.showToast('上下文规则已保存');
        this.elements.saveRules.textContent = '已保存';
        setTimeout(() => {
          this.elements.saveRules.textContent = '保存规则';
        }, 2000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to save context rules:', error);
      this.showToast('保存失败', 'error');
    }
  }

  async checkAIStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_STATUS'
      });

      this.isAIReady = response.isReady;
      this.updateStatusDisplay();
      
      // Update diagnostic when status changes
      setTimeout(() => this.runDiagnostic(), 100);
    } catch (error) {
      console.error('Failed to check AI status:', error);
      this.isAIReady = false;
      this.updateStatusDisplay();
    }
  }

  updateStatusDisplay() {
    const statusDot = this.elements.aiStatus.querySelector('.status-dot');
    const statusText = this.elements.aiStatus.querySelector('.status-text');
    
    if (this.isAIReady) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'AI 就绪';
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'AI 不可用';
    }
  }

  async sendMessage() {
    const message = this.elements.chatInput.value.trim();
    if (!message || !this.isAIReady) return;

    // Add user message to chat
    this.addMessage('user', message);
    this.elements.chatInput.value = '';
    this.elements.sendMessage.disabled = true;

    // Show loading state
    const loadingId = this.addMessage('assistant', '正在思考...', true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHAT_WITH_AI',
        data: {
          message: message,
          chatHistory: this.chatHistory.slice(-10) // Send recent history
        }
      });

      // Remove loading message
      this.removeMessage(loadingId);

      if (response.success) {
        this.addMessage('assistant', response.response);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.removeMessage(loadingId);
      this.addMessage('assistant', '抱歉，我现在无法回应。请稍后再试。');
    }
  }

  addMessage(role, content, isLoading = false) {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.id = messageId;
    
    messageDiv.innerHTML = `
      <div class="message-content ${isLoading ? 'loading' : ''}">${this.formatMessage(content)}</div>
      <div class="message-time">${timestamp}</div>
    `;

    this.elements.chatMessages.appendChild(messageDiv);
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;

    // Add to history (except loading messages)
    if (!isLoading) {
      this.chatHistory.push({
        role,
        content,
        timestamp: Date.now()
      });
      this.saveChatHistory();
    }

    return messageId;
  }

  removeMessage(messageId) {
    const element = document.getElementById(messageId);
    if (element) {
      element.remove();
    }
  }

  formatMessage(content) {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  async saveChatHistory() {
    try {
      // Keep only last 50 messages
      const recentHistory = this.chatHistory.slice(-50);
      await chrome.storage.local.set({ chatHistory: recentHistory });
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  loadChatHistory() {
    // Clear existing messages except welcome message
    const welcomeMessage = this.elements.chatMessages.querySelector('.message.assistant');
    this.elements.chatMessages.innerHTML = '';
    if (welcomeMessage) {
      this.elements.chatMessages.appendChild(welcomeMessage);
    }

    // Render chat history
    this.renderChatHistory();
  }

  renderChatHistory() {
    this.chatHistory.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${msg.role}`;
      
      const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      messageDiv.innerHTML = `
        <div class="message-content">${this.formatMessage(msg.content)}</div>
        <div class="message-time">${time}</div>
      `;
      
      this.elements.chatMessages.appendChild(messageDiv);
    });
    
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  async clearChatHistory() {
    if (confirm('确定要清空所有对话记录吗？')) {
      this.chatHistory = [];
      await chrome.storage.local.remove('chatHistory');
      this.loadChatHistory();
      this.showToast('对话记录已清空');
    }
  }

  exportChatHistory() {
    if (this.chatHistory.length === 0) {
      this.showToast('没有对话记录可以导出', 'error');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      messages: this.chatHistory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-chat-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showToast('对话记录已导出');
  }

  async runDiagnostic() {
    const diagnosticInfo = this.elements.diagnosticInfo;
    diagnosticInfo.innerHTML = '<p>🔍 正在检查AI可用性...</p>';
    
    try {
      // Simple status check based on reference implementation
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_STATUS'
      });
      
      let diagnosticHTML = '';
      let diagnosticClass = '';
      
      if (response.isReady) {
        diagnosticClass = 'success';
        diagnosticHTML = `
          <div class="diagnostic-item">
            <span class="icon success">✅</span>
            <span>LanguageModel API 可用</span>
          </div>
          <p><strong>🎉 AI功能已就绪！</strong></p>
          <p>你可以在网页输入框中使用自动补全，也可以在下方与AI对话。</p>
        `;
      } else {
        diagnosticClass = 'error';
        diagnosticHTML = `
          <div class="diagnostic-item">
            <span class="icon error">❌</span>
            <span>LanguageModel API 不可用</span>
          </div>
          
          <p><strong>⚠️ AI功能不可用</strong></p>
          <p>可能的解决方案：</p>
          <ul class="requirements-list">
            <li>📥 <strong>下载Chrome Canary</strong>: <a href="https://www.google.com/chrome/canary/" target="_blank">chrome.google.com/chrome/canary</a></li>
            <li>⚡ <strong>启用实验功能</strong>: 访问 <code>chrome://flags/#optimization-guide-on-device-model</code> 并启用</li>
            <li>🔄 <strong>重启Chrome</strong>: 完全关闭并重新打开Chrome浏览器</li>
            <li>⏰ <strong>等待模型下载</strong>: 首次使用时Chrome需要下载AI模型</li>
          </ul>
          
          <p><small>💡 <strong>提示</strong>: LanguageModel API目前仅在Chrome Canary中可用。</small></p>
        `;
      }
      
      diagnosticInfo.className = `diagnostic-info ${diagnosticClass}`;
      diagnosticInfo.innerHTML = diagnosticHTML;
      
    } catch (error) {
      console.error('Diagnostic error:', error);
      diagnosticInfo.className = 'diagnostic-info error';
      diagnosticInfo.innerHTML = `
        <div class="diagnostic-item">
          <span class="icon error">❌</span>
          <span>诊断失败</span>
        </div>
        <p>无法获取AI状态信息: ${error.message}</p>
      `;
    }
  }

  showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      padding: 12px 16px !important;
      background: ${type === 'error' ? '#ef4444' : '#10b981'} !important;
      color: white !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 10000 !important;
      transform: translateX(100%) !important;
      transition: transform 0.3s ease !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0) !important';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      toast.style.transform = 'translateX(100%) !important';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SidePanel();
  });
} else {
  new SidePanel();
}