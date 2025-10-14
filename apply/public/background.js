

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

// State
let promptSession = null;
let completionSession = null;
let writerSession = null;
let rewriterSession = null;
let defaults = null;

async function initDefaults() {
  defaults = await LanguageModel.params();
  console.log('Model default:', defaults);
  if (!('LanguageModel' in self)) {
    console.log("Prompt Model not available")
  }
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
}

initDefaults();

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageManager.handleMessage(message, sender, sendResponse);
  return true;
});

messageManager.addListener('CHAT_WITH_AI', async (data, sender) => {
  return await handleAIChat(data);
});

messageManager.addListener('CHECK_STATUS', async () => {
  return await checkingAvailability();
})

messageManager.addListener('RESET_SESSION', async () => {
  await resetAISession();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DESTROY_COPILOT_WRITER' }, (response) => {
        console.log('Content script response:', response);
      });
    }
  });
  return true;
});

messageManager.addListener('CREATE_COMPLETION_SESSION', async () => {
  createCompletionSession();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'INIT_COPILOT_WRITER' }, (response) => {
        console.log('Content script response:', response);
      });
    }
  });
  return true;
});

messageManager.addListener('COMPLETION_REQUEST', async (data, sender) => {
  return await handleCompletionRequest(data);
});


async function checkingAvailability() {
  const promptAvailability = await LanguageModel.availability();
  const writerAvailability = await Writer.availability();

  return {
    prompt: promptAvailability,
    writer: writerAvailability
  };
}


async function createPrompt() {
  const initialPrompts = [
    {
      role: 'system',
      content: 'You are a helpful and friendly job hunting assistant. Provide clear, concise responses.'
    }
  ];
  if (!promptSession) {
    if (!('LanguageModel' in self)) {
      promptSession = await LanguageModel.create({
        initialPrompts,
        temperature: 0.7,
        topK: 3,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
          });
        },
      });
    } else {
      const params = {
        initialPrompts,
        temperature: 0.7,
        topK: 3
      };
      promptSession = await LanguageModel.create(params);
    }
  }
}

async function createCompletionSession() {
  const initialPrompts = [
    {
      role: 'system',
      content: "You are a writer assistant, Please help to complete user's text. Only return the completion part."
    }
  ];
  if (!completionSession) {
    if (!('LanguageModel' in self)) {
      completionSession = await LanguageModel.create({
        initialPrompts,
        temperature: 0.7,
        topK: 3,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
          });
        },
      });
    } else {
      const params = {
        initialPrompts,
        temperature: 0.7,
        topK: 3
      };
      completionSession = await LanguageModel.create(params);
    }
  }
}

async function resetAISession() {
  if (completionSession) {
    completionSession.destroy();
  }
  completionSession = null;
}


async function handleAIChat(data) {
  const { message, chatHistory } = data;
  if (!promptSession) {
    createPrompt()
  }
  let fullPrompt = message;
  if (chatHistory && chatHistory.length > 0) {
    const historyText = chatHistory.slice(-8).map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    fullPrompt = `${historyText}\nUser: ${message}`;
  }

  const response = await promptSession.prompt(fullPrompt);
  return {
    response: response.trim(),
    timestamp: Date.now()
  };
}

async function handleCompletionRequest(data) {
  const { prompt } = data;
  console.log('Processing completion request for:', prompt);
  // 确保 completionSession 存在
  if (!completionSession) {
    await createCompletionSession();
  }

  // 构建补全提示
  const completionPrompt = `Complete the following text. Only return the completion part: ${prompt}`;

  // 使用 Prompt API 获取补全
  const response = await completionSession.prompt(completionPrompt);
  console.log('Received completion response:', response);

  return { completion: response.trim() };
}


// Writer
async function createWriterSession() {
  const options = {
    tone: 'casual',
    length: 'Medium',
    format: 'plain-text',
    sharedContext: '',
  };
  if (!writerSession) {
    writerSession = await Writer.create(options)
  }
}
async function createRewriterSession() {
  const options = {
    tone: 'casual',
    length: 'Medium',
    format: 'plain-text',
    sharedContext: '',
  };
  if (!rewriterSession) {
    rewriterSession = await Rewriter.create(options)
  }
const port = chrome.runtime.connect({ name: "AI_WRITER_STREAM" });

chrome.runtime.onConnect.addListener((port) => {

  port.onMessage.addListener(async (message) => {
    if (message.type === "WRITER_STREAM") {
      const { prompt } = message.data;
      if (!writerSession) {
        writerSession = await createWriterSession();
      }
      const stream = writerSession.writeStreaming(prompt, { context: '' });
      for await (const chunk of stream) {
        port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
      }
      port.postMessage({ type: "STREAM_END" });
    }else if (message.type === "REWRITER_STREAM") {
      const { prompt } = message.data;
      if (!rewriterSession) {
        rewriterSession = await createRewriterSession();
      }
      const stream = rewriterSession.rewriteStreaming(prompt, { context: '' });
      for await (const chunk of stream) {
        port.postMessage({ type: "STREAM_CHUNK", data: { chunk } });
      }
      port.postMessage({ type: "STREAM_END" });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log("Writer stream disconnected");
  });
});
}
