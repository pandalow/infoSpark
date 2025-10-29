// Set side panel behavior on installation
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================
class MessageHandler {
  constructor(stateManager, sessionManager) {
    this.stateManager = stateManager;
    this.sessionManager = sessionManager;
    this.setupListeners();
  }

  setupListeners() {
    const handlers = {
      'CHAT_WITH_AI': this.handleChat.bind(this),
      'CHECK_STATUS': this.checkAvailability.bind(this),
      'GET_COPILOT_STATUS': this.getCopilotStatus.bind(this),
      'CREATE_COMPLETION_SESSION': this.createCompletionSession.bind(this),
      'RESET_SESSION': this.resetSession.bind(this),
      'UPDATE_COMPLETION_OPTIONS': this.updateCompletionOptions.bind(this),
      'UPDATE_CHAT_CONTEXT': this.updateChatContext.bind(this),
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const handler = handlers[message.type];
      if (handler) {
        handler(message.data, sender)
          .then(result => sendResponse({ success: true, data: result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
      } else {
        sendResponse({ success: false, error: "Unknown message type" });
      }
    });
  }

  async handleChat(data) {
    const { message, chatHistory } = data;
    const pageText = await this.sessionManager.getStorageValue('pageTextSnapshot') || '';

    await this.sessionManager.createPromptSession();

    let fullPrompt = '';
    if (pageText) fullPrompt += `Context from page:\n${pageText}\n\n`;

    if (chatHistory?.length > 0) {
      const historyText = chatHistory.slice(-8).map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');
      fullPrompt += `${historyText}\nUser: ${message}`;
    } else {
      fullPrompt += message;
    }

    const response = await this.sessionManager.sessions.prompt.prompt(fullPrompt);
    return { response: response.trim(), timestamp: Date.now() };
  }

  async checkAvailability() {
    try {
      const [promptAvailability, writerAvailability, rewriterAvailability] = await Promise.all([
        LanguageModel.availability(),
        Writer.availability(),
        Rewriter.availability()
      ]);

      return {
        prompt: promptAvailability,
        writer: writerAvailability,
        rewriter: rewriterAvailability
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        prompt: 'unavailable',
        writer: 'unavailable',
        rewriter: 'unavailable'
      };
    }
  }

  async getCopilotStatus() {
    if (!this.stateManager.isInitialized) {
      await this.stateManager.load();
    }
    return { isEnabled: this.stateManager.copilotState.isEnabled };
  }

  async createCompletionSession() {
    await this.sessionManager.createCompletionSession();
    await this.sessionManager.createPromptSession();

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await this.stateManager.enableCopilot(tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, { type: 'INIT_COPILOT_WRITER' });
    }
    return true;
  }

  async resetSession() {
    this.sessionManager.destroyAllExcept('prompt');
    await this.stateManager.disableCopilot();

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DESTROY_COPILOT_WRITER' });
    }
    return true;
  }

  async updateCompletionOptions() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_COMPLETION_OPTIONS' });
    }
    return true;
  }

  async updateChatContext() {
    this.sessionManager.destroy('prompt');
    await this.sessionManager.createPromptSession();
    return true;
  }
}
// =============================================================================
// STATE MANAGEMENT
// =============================================================================
class StateManager {
  /**
   * Manages the state of the Copilot feature.
   * @constructor
   * @param {Object} initialState - The initial state of the Copilot feature.
   */
  constructor() {
    this.copilotState = {
      isEnabled: false,
      activeTabId: null
    };
  }
  async save() {
    try {
      await chrome.storage.local.set({ copilotState: this.copilotState });
    } catch (error) {
      console.error('Failed to save copilot state:', error);
    }
  }
  async load() {
    try {
      const result = await chrome.storage.local.get(['copilotState']);
      if (result.copilotState) {
        this.copilotState = { ...this.copilotState, ...result.copilotState };
      }
    } catch (error) {
      console.error('Failed to load copilot state:', error);
    }
  }

  async enableCopilot(tabId) {
    this.copilotState.isEnabled = true;
    this.copilotState.activeTabId = tabId;
    await this.save();
  }
  async disableCopilot() {
    this.copilotState.isEnabled = false;
    this.copilotState.activeTabId = null;
    await this.save();
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================
class SessionManager {
  /**
   * Manages different AI sessions (prompt, completion, writer, rewriter).
   * @constructor
   * How to use:
   *   const sessionManager = new SessionManager();
   *   sessionManager.createSession('prompt', initialData);
   *   sessionManager.getSession('prompt');
   *   sessionManager.destroySession('prompt');
   */
  constructor() {
    this.sessions = {
      prompt: null,
      completion: null,
      writer: null,
      rewriter: null,
    };
    this.downloadProgress = {
      prompt: 0,
      completion: 0,
      writer: 0,
      rewriter: 0
    };
    this.downloadStatus = {
      prompt: 'unknown',
      completion: 'unknown',
      writer: 'unknown',
      rewriter: 'unknown'
    };
  }

  // Broadcast download progress to frontend
  broadcastDownloadProgress(type, progress) {
    this.downloadProgress[type] = progress;

    // Send message to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MODEL_DOWNLOAD_PROGRESS',
          data: {
            modelType: type,
            progress: progress,
            allProgress: this.downloadProgress
          }
        }, () => {
          // Ignore errors, some pages might not have content script
          if (chrome.runtime.lastError) {
            // Silent ignore
          }
        });
      });
    });

    // Send message to sidepanel
    chrome.runtime.sendMessage({
      type: 'MODEL_DOWNLOAD_PROGRESS',
      data: {
        modelType: type,
        progress: progress,
        allProgress: this.downloadProgress
      }
    }, () => {
      if (chrome.runtime.lastError) {
        // Silent ignore
      }
    });
  }

  // Broadcast download status changes
  broadcastDownloadStatus(type, status) {
    this.downloadStatus[type] = status;

    chrome.runtime.sendMessage({
      type: 'MODEL_STATUS_CHANGED',
      data: {
        modelType: type,
        status: status,
        allStatus: this.downloadStatus
      }
    }, () => {
      if (chrome.runtime.lastError) {
        // Silent ignore
      }
    });
  }

  destroy(type) {
    if (this.sessions[type]) {
      this.sessions[type].destroy();
      this.sessions[type] = null;
    }
  }

  destroyAllExcept(exceptKey) {
    Object.keys(this.sessions).forEach(key => {
      if (key !== exceptKey) {
        this.destroy(key);
      }
    });
  }


  async createPromptSession() {
    if (this.sessions.prompt) return this.sessions.prompt;

    const content = await this.getStorageValue('prompt_content');
    const initialPrompts = [{
      role: 'system',
      content: "You're a helpful assistant. Answer the user's questions based on the provided context." + (content || "")
    }];

    // First check availability
    const availability = await LanguageModel.availability();
    this.broadcastDownloadStatus('prompt', availability);

    // If not available status, throw error instead of trying to create
    if (availability !== 'available') {
      throw new Error(`Language model is ${availability}. Please wait for download to complete or check model availability.`);
    }

    try {
      this.sessions.prompt = await LanguageModel.create({
        outputLanguage: 'en',
        initialPrompts,
        temperature: 0.7,
        topK: 3,
        monitor: (m) => {
          m.addEventListener('downloadprogress', (e) => {
            const progress = e.loaded * 100;
            this.broadcastDownloadProgress('prompt', progress);
          });
        },
      });
    } catch (error) {
      console.error('Failed to create prompt session:', error);
      // Re-check status
      const newAvailability = await LanguageModel.availability();
      this.broadcastDownloadStatus('prompt', newAvailability);
      throw error;
    }

    // Update status on successful creation
    this.broadcastDownloadStatus('prompt', 'available');
    return this.sessions.prompt;
  }

  async createCompletionSession() {
    if (this.sessions.completion) return this.sessions.completion;

    const initialPrompts = [{
      role: 'system',
      content: "You are a precise writing assistant. When given text, continue it with ONLY the next logical sentence or phrase. Rules: 1) Complete the current thought if incomplete, 2) Add only 1 sentence if complete, 3) Never write multiple paragraphs, 4) Stop at first natural sentence ending, 5) Be contextually relevant and concise."
    }];

    // First check availability
    const availability = await LanguageModel.availability();
    this.broadcastDownloadStatus('completion', availability);

    // If not available status, throw error instead of trying to create
    if (availability !== 'available') {
      throw new Error(`Language model is ${availability}. Please wait for download to complete or check model availability.`);
    }

    try {
      this.sessions.completion = await LanguageModel.create({
        outputLanguage: 'en',
        initialPrompts,
        temperature: 0.6,
        topK: 3,
        monitor: (m) => {
          m.addEventListener('downloadprogress', (e) => {
            const progress = e.loaded * 100;
            this.broadcastDownloadProgress('completion', progress);
            console.log(`Completion model: ${progress.toFixed(1)}%`);
          });
        },
      });
    } catch (error) {
      console.error('Failed to create completion session:', error);
      // Re-check status
      const newAvailability = await LanguageModel.availability();
      this.broadcastDownloadStatus('completion', newAvailability);
      throw error;
    }

    // Update status on successful creation
    this.broadcastDownloadStatus('completion', 'available');
    return this.sessions.completion;
  }
  async createWriterSession() {
    if (this.sessions.writer) return this.sessions.writer;

    const options = await this.getStorageValue('writerOptions') || {
      tone: 'neutral',
      length: 'medium',
      format: 'plain-text',
      sharedContext: '',
    };
    const availability = await Writer.availability();
    this.broadcastDownloadStatus('writer', availability);

    // If not available status, throw error instead of trying to create
    if (availability !== 'available') {
      throw new Error(`Writer is ${availability}. Please wait for download to complete or check writer availability.`);
    }

    try {
      this.sessions.writer = await Writer.create(options);

      // Update status on successful creation
      this.broadcastDownloadStatus('writer', 'available');
      return this.sessions.writer;
    } catch (error) {
      console.error('Failed to create writer session:', error);
      // Re-check status
      const newAvailability = await Writer.availability();
      this.broadcastDownloadStatus('writer', newAvailability);
      throw error;
    }
  }

  async createRewriterSession() {
    if (this.sessions.rewriter) return this.sessions.rewriter;

    const options = await this.getStorageValue('rewriterOptions') || {
      tone: 'as-is',
      format: 'as-is',
      length: 'as-is',
      sharedContext: '',
    };
    const availability = await Rewriter.availability();
    this.broadcastDownloadStatus('rewriter', availability);
    if (availability !== 'available') {
      throw new Error(`Rewriter is ${availability}. Please wait for download to complete or check rewriter availability.`);
    }

    try {
      this.sessions.rewriter = await Rewriter.create(options);
      this.broadcastDownloadStatus('rewriter', 'available');
      return this.sessions.rewriter;
    } catch (error) {
      console.error('Failed to create rewriter session:', error);
      // Re-check status
      const newAvailability = await Rewriter.availability();
      this.broadcastDownloadStatus('rewriter', newAvailability);
      throw error;
    }
  }

  async getStorageValue(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }
}

// =============================================================================
//  STREAMING HANDLER
// =============================================================================
class StreamHandler {
  /**
   * Manages streaming responses for different AI sessions.
  */
  constructor(SessionManager) {
    this.sessionManager = SessionManager;
    this.abortControllers = {
      completion: null,
      writer: null,
      rewriter: null
    };
  }

  abort(type) {
    if (this.abortControllers[type]) {
      this.abortControllers[type].abort();
      this.abortControllers[type] = null;
    }
  }

  abortAll() {
    Object.keys(this.abortControllers).forEach(type => {
      this.abort(type);
    });
  }

  buildCompletionPrompt(prompt, paragraphText, fullPageText, metadata, options) {
    if (!options?.enableContextAware || options.contextLevel === 'none') {
      return `Complete the following text with just the next logical sentence or phrase: "${prompt}"`;
    }

    if (options.contextLevel === 'paragraph') {
      const context = this.truncateText(paragraphText || '', options.maxContextLength || 1000, 1000);
      return `Based on this paragraph context: "${context}"\n\nComplete the following text with just the next logical sentence or phrase: "${prompt}"`;
    }

    if (options.contextLevel === 'fullpage') {
      const context = this.smartTruncate(fullPageText || '', options.maxContextLength || 1000, 3000);
      return `Based on this page context (${metadata?.contentType || 'general'} content): "${context}"\n\nComplete the following text with just the next logical sentence or phrase: "${prompt}"`;
    }

    return `Complete the following text with just the next logical sentence or phrase: "${prompt}"`;
  }


  handleStreamError(error, port, type) {
    if (error.name === 'AbortError') {
      console.log(`${type} stream aborted`);
      port.postMessage({ type: "STREAM_ABORTED" });
    } else {
      console.error(`${type} stream error:`, error);
      port.postMessage({
        type: "STREAM_ERROR",
        error: `${type} failed: ${error.message}`
      });
    }
  }

  async handleCompletion(data, port) {
    this.abort('completion');
    this.abortControllers.completion = new AbortController();

    const { prompt, paragraphText, fullPageText, metadata, options } = data;
    await this.sessionManager.createCompletionSession();
    const completionPrompt = this.buildCompletionPrompt(prompt, paragraphText, fullPageText, metadata, options);

    try {
      const stream = this.sessionManager.sessions.completion.promptStreaming(completionPrompt, {
        signal: this.abortControllers.completion.signal
      });

      let accumulatedText = '';
      let wordCount = 0;

      for await (const chunk of stream) {
        accumulatedText += chunk;
        wordCount += chunk.split(/\s+/).length

        // Count sentences by looking for sentence-ending punctuation
        const hasSentenceEnd = /[.!?]\s*$/.test(accumulatedText.trim());

        // Stop conditions:
        // 1. After 1-2 complete sentences
        // 2. If we've accumulated too much text (150+ chars)
        // 3. If we see paragraph breaks or multiple line breaks
        if ((wordCount >= 15 && hasSentenceEnd) || wordCount >= 30) {
          port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
          break;
        }
        port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
      }
      port.postMessage({ type: "STREAM_END" });
      this.abortControllers.completion = null;
    } catch (error) {
      this.handleStreamError(error, port, 'Completion');
    }

  }
  async handleWriter(message, port) {
    this.abort('writer');
    this.abortControllers.writer = new AbortController();

    const { prompt } = message.data;
    await this.sessionManager.createWriterSession();

    try {
      const stream = this.sessionManager.sessions.writer.writeStreaming(prompt, {
        context: '',
        signal: this.abortControllers.writer.signal
      });

      for await (const chunk of stream) {
        port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
      }

      port.postMessage({ type: "STREAM_END" });
      this.abortControllers.writer = null;

    } catch (error) {
      this.handleStreamError(error, port, 'Writer');
    }
  }

  async handleRewriter(message, port) {
    this.abort('rewriter');
    this.abortControllers.rewriter = new AbortController();

    const { prompt } = message.data;
    await this.sessionManager.createRewriterSession();

    try {
      const stream = this.sessionManager.sessions.rewriter.rewriteStreaming(prompt, {
        context: '',
        signal: this.abortControllers.rewriter.signal
      });

      for await (const chunk of stream) {
        port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
      }

      port.postMessage({ type: "STREAM_END" });
      this.abortControllers.rewriter = null;

    } catch (error) {
      this.handleStreamError(error, port, 'Rewriter');
    }
  }
  truncateText(text, userLimit, maxLimit) {
    const limit = Math.min(userLimit, maxLimit);
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  }

  smartTruncate(text, userLimit, maxLimit) {
    const limit = Math.min(userLimit, maxLimit);
    if (text.length <= limit) return text;

    const startPart = text.substring(0, Math.floor(limit * 0.4));
    const endPart = text.substring(Math.max(0, text.length - Math.floor(limit * 0.6)));
    return startPart + "\n...[content omitted]...\n" + endPart;
  }

}

// =============================================================================
// MAIN APPLICATION
// =============================================================================


class AIAssistantBackground {
  constructor() {
    this.stateManager = new StateManager();
    this.sessionManager = new SessionManager();
    this.messageHandler = new MessageHandler(this.stateManager, this.sessionManager);
    this.streamHandler = new StreamHandler(this.sessionManager);

    this.init();
  }

  async init() {
    // Initialize defaults
    const defaults = await LanguageModel.params();
    console.log('Model defaults:', defaults);

    await this.stateManager.load();
    console.log('Copilot state loaded:', this.stateManager.copilotState);

    this.setupTabListeners();
    this.setupStreamListener();
  }

  setupTabListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' &&
        this.stateManager.copilotState.isEnabled &&
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://')) {

        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: 'INIT_COPILOT_WRITER' });
        }, 500);
      }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      if (this.stateManager.copilotState.isEnabled) {
        this.stateManager.copilotState.activeTabId = activeInfo.tabId;
        this.stateManager.save();
      }
    });
  }

  setupStreamListener() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "AI_WRITER_STREAM") {
        const streamHandler = new StreamHandler(this.sessionManager);

        port.onMessage.addListener(async (message) => {
          try {
            switch (message.type) {
              case "COMPLETION_STREAM":
                await streamHandler.handleCompletion(message.data, port);
                break;
              case "WRITER_STREAM":
                await streamHandler.handleWriter(message, port);
                break;
              case "REWRITER_STREAM":
                await streamHandler.handleRewriter(message, port);
                break;
            }
          } catch (error) {
            console.error(`Stream error for ${message.type}:`, error);
            port.postMessage({
              type: "STREAM_ERROR",
              error: error.message || 'Unknown error occurred'
            });
          }
        });

        port.onDisconnect.addListener(() => {
          console.log("AI stream port disconnected");
          streamHandler.abortAll();
        });
      }
    });
  }
}

const aiAssistantBackground = new AIAssistantBackground();
// --- IGNORE ---