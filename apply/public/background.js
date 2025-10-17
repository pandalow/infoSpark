class MessageManager {

  constructor() {
    this.listener = new Map();
    this.requestId = 0;
  }

  addListener(type, handler) {
    // Creating new type list storing handler
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

  // Receiving message 
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

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});


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
  // 恢复Copilot状态
  await loadCopilotState();
  console.log('Copilot state loaded:', copilotState);
  isInitialized = true;
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
}

initDefaults();

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

// 监听tab更新（页面刷新、导航等）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, changeInfo.status, 'copilotEnabled:', copilotState.isEnabled);

  // 当页面完成加载且Copilot是启用状态时，自动初始化
  if (changeInfo.status === 'complete' &&
    copilotState.isEnabled &&
    tab.url &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('chrome-extension://')) {

    console.log('Attempting to auto-init CopilotWriter for tab:', tabId, tab.url);

    // 延迟一点确保content script已加载
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

// 监听活动tab切换
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (copilotState.isEnabled) {
    // 更新当前活动tab
    copilotState.activeTabId = activeInfo.tabId;
    saveCopilotState();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageManager.handleMessage(message, sender, sendResponse);
  return true;
});

messageManager.addListener('CHAT_WITH_AI', async (data, sender) => {
  return await handleAIChat(data);
});

messageManager.addListener('UPDATE_CHAT_CONTEXT', async () => {
  // 清除现有的 prompt session
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

messageManager.addListener('ENABLE_WRITER', async () => {
  await createWriterSession();
});

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
  // 确保状态已经加载
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

  // 更新Copilot状态
  copilotState.isEnabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      copilotState.activeTabId = tabs[0].id;
      saveCopilotState(); // 保存状态

      chrome.tabs.sendMessage(tabs[0].id, { type: 'INIT_COPILOT_WRITER' }, (response) => {
        console.log('Content script response:', response);
      });
    }
  });
  return true;
});

messageManager.addListener('ENABLE_COMPLETION', async () => {
  if (!sessions.completion) {
    await createCompletionSession();
  }
});

messageManager.addListener('COMPLETION_REQUEST', async (data, sender) => {
  return await handleCompletionRequest(data);
});


// Manage Storage
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

  chrome.storage.local.remove(['pageTextSnapshot']).catch((error) => {
    console.error('Failed to remove pageTextSnapshot from storage:', error);
  });

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
        content: "You are a writer assistant, Please help to complete user's text. Only return the completion part."
      }
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

  // 1. 读取 pageTextSnapshot 作为 context
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

  // 2. 拼接 context + chat history + 当前消息
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

  // 3. 调用 prompt
  const response = await sessions.prompt.prompt(fullPrompt);
  return {
    response: response.trim(),
    timestamp: Date.now()
  };
}

async function handleCompletionRequest(data) {
  const { prompt } = data;
  console.log('Processing completion request for:', prompt);
  // 确保 completionSession 存在
  if (!sessions.completion) {
    await createCompletionSession();
  }

  // 构建补全提示
  const completionPrompt = `Complete the following text. Only return the completion part: ${prompt}`;

  // 使用 Prompt API 获取补全
  const response = await sessions.completion.prompt(completionPrompt);
  console.log('Received completion response:', response);
  return { completion: response.trim() };
}


// Writer
chrome.runtime.onConnect.addListener((port) => {
  console.log('New port connection received:', port.name);
  if (port.name === "AI_WRITER_STREAM") {

    port.onMessage.addListener(async (message) => {
      if (message.type === "WRITER_STREAM") {
        const { prompt } = message.data;
        if (!sessions.writer) {
          await createWriterSession();
        }
        const stream = sessions.writer.writeStreaming(prompt, { context: '' });
        for await (const chunk of stream) {
          port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
        }
        console.log('Stream completed');
        port.postMessage({ type: "STREAM_END" });
      } else if (message.type === "REWRITER_STREAM") {
        console.log('Processing REWRITER_STREAM request');
        const { prompt } = message.data;
        if (!sessions.rewriter) {
          console.log('Creating rewriter session...');
          await createRewriterSession();
        }
        console.log('Starting rewriteStreaming...');
        const stream = sessions.rewriter.rewriteStreaming(prompt, { context: '' });
        for await (const chunk of stream) {
          port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
        }
        console.log('Rewrite stream completed');
        port.postMessage({ type: "STREAM_END" });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log("Writer stream disconnected");
    });
  }
});

