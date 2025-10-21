// Set side panel behavior on installation
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});


class MessageManager {
  /**
   * Manages message passing between different parts of the extension.
   * @constructor
   * How to use:
   *   const messageManager = new MessageManager();
   *   messageManager.addListener('MESSAGE_TYPE', handlerFunction);
   *   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
   *     messageManager.handleMessage(message, sender, sendResponse);
   *     return true; // Indicate async response
   *   });
   * @example
   *   messageManager.addListener('greeting', (data, sender) => {
   *     console.log('Received greeting:', data);
   *   });
   */

  constructor() {
    this.listener = new Map();
    this.requestId = 0;
  }

  addListener(type, handler) {
    if (!this.listener.has(type)) {
      this.listener.set(type, []);
    }
    this.listener.get(type).push(handler)
  }
  removeListener(type, handler) {
    if (this.listener.has(type)) {
      const handlers = this.listener.get(type);
      const index = handlers.indexOf(handler);

      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  // Handles incoming messages and routes them to the appropriate listener.
  handleMessage(message, sender, sendResponse) {
    const { type, data } = message;
    if (this.listener.has(type)) {
      const handlers = this.listener.get(type);
      handlers.forEach(handler => {
        try {
          const result = handler(data, sender);
          if (result instanceof Promise) {
            result.then(response => sendResponse({ success: true, data: response }))
              .catch(error => sendResponse({ success: false, error: error.message }));
            return true
          } else if (result !== undefined) {
            sendResponse({ success: true, data: result });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message })
        }
      })
    } else {
      sendResponse({ success: false, error: "Unknown message type" })
    }
  }
}


const messageManager = new MessageManager();


// Session management
const sessions = {
  prompt: null,
  completion: null,
  writer: null,
  rewriter: null,
};

// Copilot State management
let copilotState = {
  isEnabled: false,
  activeTabId: null
};

// Save Copilot state to storage
async function saveCopilotState() {
  try {
    await chrome.storage.local.set({ copilotState });
  } catch (error) {
    console.error('Failed to save copilot state:', error);
  }
}

// Load Copilot state from storage
async function loadCopilotState() {
  try {
    const result = await chrome.storage.local.get(['copilotState']);
    if (result.copilotState) {
      copilotState = { ...copilotState, ...result.copilotState };
    }
  } catch (error) {
    console.error('Failed to load copilot state:', error);
  }
}

let defaults = null;
let isInitialized = false;

async function initDefaults() {
  defaults = await LanguageModel.params();
  console.log('Model default:', defaults);
  if (!('LanguageModel' in self)) {
    console.log("Prompt Model not available")
  }
  // Revive Copilot state --- IGNORE ---
  await loadCopilotState();
  console.log('Copilot state loaded:', copilotState);
  isInitialized = true;
}

initDefaults();

// Monitor tab updates (refresh, navigation, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, changeInfo.status, 'copilotEnabled:', copilotState.isEnabled);

  // When a tab finishes loading, auto-init CopilotWriter if enabled
  if (changeInfo.status === 'complete' &&
    copilotState.isEnabled &&
    tab.url &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('chrome-extension://')) {

    console.log('Attempting to auto-init CopilotWriter for tab:', tabId, tab.url);

    // Set a slight delay to ensure content script is ready --- IGNORE ---
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'INIT_COPILOT_WRITER' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Failed to init copilot on tab:', chrome.runtime.lastError.message);
        } else {
          console.log('Auto-initialized CopilotWriter on tab:', tabId, response);
        }
      });
    }, 500);
  }
});

// Monitor active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (copilotState.isEnabled) {
    // Update current active tab
    copilotState.activeTabId = activeInfo.tabId;
    saveCopilotState();
  }
});


// Message Handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageManager.handleMessage(message, sender, sendResponse);
  return true;
});

// Register message listeners
messageManager.addListener('CHAT_WITH_AI', async (data, sender) => {
  return await handleAIChat(data);
});

messageManager.addListener('UPDATE_COMPLETION_OPTIONS', async () => {
  // 通知content script更新配置
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_COMPLETION_OPTIONS' }, (response) => {
        console.log('Completion options updated on content script:', response);
      });
    }
  });
  return true;
});

messageManager.addListener('UPDATE_CHAT_CONTEXT', async () => {
  // Clear existing prompt session
  if (sessions.prompt) {
    sessions.prompt.destroy();
    sessions.prompt = null;
  }
  await createPromptSession();
  return true;
});

messageManager.addListener('CHECK_STATUS', async () => {
  return await checkingAvailability();
})

messageManager.addListener('ENABLE_REWRITER', async () => {
  await createRewriterSession();
});

messageManager.addListener('RESET_SESSION', async () => {
  resetAllSessions();
  copilotState.isEnabled = false;
  copilotState.activeTabId = null;
  await saveCopilotState();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DESTROY_COPILOT_WRITER' }, (response) => {
        console.log('Content script response:', response);
      });
    }
  });
  return true;
});

messageManager.addListener('GET_COPILOT_STATUS', async () => {
  if (!isInitialized) {
    await loadCopilotState();
    isInitialized = true;
  }
  console.log('GET_COPILOT_STATUS requested, current state:', copilotState);
  return { isEnabled: copilotState.isEnabled };
});

messageManager.addListener('CREATE_COMPLETION_SESSION', async () => {
  createCompletionSession();
  createPromptSession();

  // Enable Copilot
  copilotState.isEnabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      copilotState.activeTabId = tabs[0].id;
      saveCopilotState(); // Save state

      chrome.tabs.sendMessage(tabs[0].id, { type: 'INIT_COPILOT_WRITER' }, (response) => {
        console.log('Content script response:', response);
      });
    }
  });
  return true;
});

// Completion Session Handling
messageManager.addListener('ENABLE_COMPLETION', async () => {
  if (!sessions.completion) {
    await createCompletionSession();
  }
});

// Storage Management
async function getStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(result[key]);
    });
  });
}

// Main Function
async function checkingAvailability() {
  const promptAvailability = await LanguageModel.availability();
  const writerAvailability = await Writer.availability();
  const rewriterAvailability = await Rewriter.availability();

  return {
    prompt: promptAvailability,
    writer: writerAvailability,
    rewriter: rewriterAvailability
  };
}

function destroySessions(exceptKey) {
  for (const key in sessions) {
    if (key !== exceptKey && sessions[key]) {
      sessions[key].destroy();
      sessions[key] = null;
    }
  }
}

function resetAllSessions() {
  destroySessions('prompt');
}

async function createSession(type, createFn) {
  destroySessions('prompt');
  if (!sessions[type]) {
    sessions[type] = await createFn();
  }
  return sessions[type];
}

async function createPromptSession() {
  return await createSession('prompt', async () => {

    const content = await getStorage('prompt_content');
    const initialPrompts = [
      {
        role: 'system',
        content: "You're a helpful assistant. Answer the user's questions based on the provided context." + (content !== undefined ? content : "")
      },
    ];
    return await LanguageModel.create({
      initialPrompts,
      temperature: 0.7,
      topK: 3,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
    });
  });
}

async function createCompletionSession() {
  return await createSession('completion', async () => {
    const initialPrompts = [
      {
        role: 'system',
        content: "You are a smart writing assistant. When given text, continue it naturally with 1-2 relevant sentences. Be concise, contextual, and helpful. Only provide the continuation, not the original text."
      }
    ];
    return await LanguageModel.create({
      initialPrompts,
      temperature: 0.8,
      topK: 3,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Completion model downloaded ${e.loaded * 100}%`);
        });
      },
    });
  });
}

async function createWriterSession() {
  console.log('Creating writer session...');
  return await createSession('writer', async () => {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['writerOptions'], resolve);
    });
    const options = result.writerOptions || {
      tone: 'neutral',
      length: 'medium',
      format: 'plain-text',
      sharedContext: '',
    };
    return await Writer.create(options);
  });
}

async function createRewriterSession() {
  console.log('Creating rewriter session...');
  return await createSession('rewriter', async () => {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['rewriterOptions'], resolve);
    });
    const options = result.rewriterOptions || {
      tone: 'as-is',
      format: 'as-is',
      length: 'as-is',
      sharedContext: '',
    };
    return await Rewriter.create(options);
  });
}

async function handleAIChat(data) {
  const { message, chatHistory } = data;

  // Read pageTextSnapshot as context
  let pageText = '';
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['pageTextSnapshot'], resolve);
    });
    if (result.pageTextSnapshot) {
      pageText = result.pageTextSnapshot;
    }
  } catch (e) {
    console.warn('Failed to get pageTextSnapshot:', e);
  }

  if (!sessions.prompt) {
    await createPromptSession();
  }

  // Construct full prompt with context + chat history + current message
  let fullPrompt = '';
  if (pageText) {
    fullPrompt += `Context from page:\n${pageText}\n\n`;
  }
  if (chatHistory && chatHistory.length > 0) {
    const historyText = chatHistory.slice(-8).map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    fullPrompt += `${historyText}\nUser: ${message}`;
  } else {
    fullPrompt += message;
  }

  // Call prompt
  const response = await sessions.prompt.prompt(fullPrompt);
  return {
    response: response.trim(),
    timestamp: Date.now()
  };
}

// Streaming Handling
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "AI_WRITER_STREAM") {

    port.onMessage.addListener(async (message) => {
      try {
        if (message.type === "COMPLETION_STREAM") {
          const { prompt, paragraphText, fullPageText, metadata, options } = message.data;
          console.log('Starting completion stream with context level:', options?.contextLevel || 'none');
          
          if (!sessions.completion) {
            await createCompletionSession();
          }
    
          let completionPrompt = '';
          
          if (options?.enableContextAware && options.contextLevel !== 'none') {
            if (options.contextLevel === 'paragraph') {
              // Use paragraph-specific context text
              const contextToUse = paragraphText || '';
              const maxLength = Math.min(options.maxContextLength || 1000, 1000);
              const truncatedContext = contextToUse.length > maxLength ? 
                contextToUse.substring(0, maxLength) + '...' : contextToUse;
                
              completionPrompt = `Based on this paragraph context: "${truncatedContext}"

Continue writing from this text naturally and concisely: "${prompt}"`;
              
              console.log('Using paragraph context, length:', contextToUse.length);
              
            } else if (options.contextLevel === 'fullpage') {
              // Use full page context text
              const contextToUse = fullPageText || '';
              const maxLength = Math.min(options.maxContextLength || 1000, 3000);
              
              // Smart truncation: keep beginning and end parts
              let truncatedContext = '';
              if (contextToUse.length > maxLength) {
                const startPart = contextToUse.substring(0, Math.floor(maxLength * 0.4));
                const endPart = contextToUse.substring(Math.max(0, contextToUse.length - Math.floor(maxLength * 0.6)));
                truncatedContext = startPart + "\n...[content omitted]...\n" + endPart;
              } else {
                truncatedContext = contextToUse;
              }
              
              completionPrompt = `Based on this page context (${metadata?.contentType || 'general'} content, title: "${metadata?.title || 'Unknown'}"): "${truncatedContext}"

Continue writing from this text naturally and contextually: "${prompt}"`;
              
              console.log('Using full page context, original length:', contextToUse.length, 'truncated length:', truncatedContext.length);
            }
          } else {
            // No context mode - use only the current input
            completionPrompt = `Continue writing from this text naturally and concisely: "${prompt}"`;
            console.log('Using no context mode');
          }
          
          const stream = sessions.completion.promptStreaming(completionPrompt);
          for await (const chunk of stream) {
            port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
          }
          port.postMessage({ type: "STREAM_END" });
          console.log('Completion stream completed');
          
        } else if (message.type === "WRITER_STREAM") {
          const { prompt } = message.data;
          console.log('Starting writer stream for:', prompt);
          
          if (!sessions.writer) {
            await createWriterSession();
          }
          
          const stream = sessions.writer.writeStreaming(prompt, { context: '' });
          for await (const chunk of stream) {
            port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
          }
          port.postMessage({ type: "STREAM_END" });
          console.log('Writer stream completed');
          
        } else if (message.type === "REWRITER_STREAM") {
          console.log('Starting rewriter stream for:', message.data.prompt);
          const { prompt } = message.data;
          
          if (!sessions.rewriter) {
            await createRewriterSession();
          }
          
          const stream = sessions.rewriter.rewriteStreaming(prompt, { context: '' });
          for await (const chunk of stream) {
            port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
          }
          port.postMessage({ type: "STREAM_END" });
          console.log('Rewriter stream completed');
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
    });
  }
});

