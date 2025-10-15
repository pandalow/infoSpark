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
const sessions = {
  prompt: null,
  completion: null,
  writer: null,
  rewriter: null,
};
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
  resetAllSessions();
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
  createPromptSession();
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


// 核心功能
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
    const initialPrompts = [
      { role: 'system', content: 'You are a helpful and friendly job hunting assistant. Provide clear, concise responses.' }
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
        role: 'system', content: "You are a writer assistant, Please help to complete user's text. Only return the completion part."
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
  return await createSession('writer', async () => {
    const options = {
      tone: 'casual',
      length: 'medium',
      format: 'plain-text',
      sharedContext: '',
    };
    return await Writer.create(options);
  });
}

async function createRewriterSession() {
  return await createSession('rewriter', async () => {
    const options = {
      tone: 'more-casual',
      format: 'plain-text',
      length: 'shorter',
      sharedContext: '',
    };
    return await Rewriter.create(options);
  });
}

async function handleAIChat(data) {
  const { message, chatHistory } = data;
  if (!sessions.prompt) {
    createPromptSession();
  }
  let fullPrompt = message;
  if (chatHistory && chatHistory.length > 0) {
    const historyText = chatHistory.slice(-8).map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    fullPrompt = `${historyText}\nUser: ${message}`;
  }

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
    console.log('Writer stream connected');

    port.onMessage.addListener(async (message) => {
      console.log('Port received message:', message);
      if (message.type === "WRITER_STREAM") {
        console.log('Processing WRITER_STREAM request');
        const { prompt } = message.data;
        if (!sessions.writer) {
          console.log('Creating writer session...');
          await createWriterSession();
        }
        console.log('Starting writeStreaming...');
        const stream = sessions.writer.writeStreaming(prompt, { context: '' });
        for await (const chunk of stream) {
          console.log('Sending chunk:', chunk);
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
          console.log('Sending rewrite chunk:', chunk);
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

