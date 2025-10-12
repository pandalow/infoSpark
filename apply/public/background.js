

class MessageManager {

  constructor() {
    this.listener = new Map();
    this.requestId = 0;
  }

  // Adding sending logical
  async sendToBackGround(type, data = null) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type,
            data,
            requestId: ++this.requestId,
            timestamp: Date.now(),
          },
          (response) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve(response);
          }
        );
      });

      if (response && response.error) {
        throw new Error(response.error);
      }

      return response;
    } catch (err) {
      console.error(`Message error (${type}):`, err);
      throw err;
    }
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
let isPromptAvailable = "unknown"
let isWriterAvailable = "unknown"
let promptSession = null;
let writerSession = null;
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

// Function
async function aiInitStatus() {
  const promptAvailability = await checkingAvailability("PROMPT");
  isPromptAvailable = promptAvailability
  const writerAvailability = await checkingAvailability("WRITER");
  isWriterAvailable = writerAvailability
}

aiInitStatus()

chrome.runtime.onInstalled.addListener(({ reason }) => {
  aiInitStatus()
  if (reason === 'install') {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
});

chrome.runtime.onStartup.addListener(() => {
  aiInitStatus()
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageManager.handleMessage(message, sender, sendResponse);
  return true;
});

messageManager.addListener('CHAT_WITH_AI', async (data, sender) => {
  return await handleAIChat(data);
});

messageManager.addListener('CHECK_STATUS', async () => {
  return await getAIStatus();
})

messageManager.addListener('RESET_SESSION', async (data) => {
  const { type } = data;
  await resetAISession(type);
  return true;
});

messageManager.addListener('CREATE_WRITER', async () => {
  await createWriter();
  return true;
});
messageManager.addListener('CREATE_PROMPT', async () => {
  createPrompt();
  return true;
});

async function getAIStatus() {
  return {
    prompt: isPromptAvailable,
    writer: isWriterAvailable,
  };
}

async function checkingAvailability(type) {
  try {
    let availability;
    if (type === 'PROMPT') {
      availability = await LanguageModel.availability();
    } else if (type === "WRITER") {
      availability = await Writer.availability();
    }
    return availability;
  } catch (err) {
    console.error("Unexpected Error When checking availability", err);
    return 'unavailable';
  }
}

async function resetAISession(type) {
  switch (type) {
    case "PROMPT":
      if (promptSession) {
        promptSession.destroy();
      }
      promptSession = null;
      break;
    case "WRITER":
      if (writerSession) {
        writerSession.destroy();
      }
      writerSession = null;
      break;
  }
}

async function createPrompt() {
  const initialPrompts = [
    {
      role: 'system',
      content: 'You are a helpful and friendly coding assistant. Provide clear, concise responses.'
    }
  ];
  if (!promptSession) {
    if (isPromptAvailable === "downloadable") {
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

async function handleAIChat(data) {
  const { message, chatHistory } = data;
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


// Port Manage
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name !== "writer") {
    return;
  }
  port.onMessage.addListener(function (msg) {
    if (msg.type === "COMPLETION") {
      const stream = writer.writeStreaming(prompt);
      for await (const chunk of stream) {
        port.postMessage({
          type: "STREAM_DATA",
          data: chunk
        })
      }
    }
  });
});

async function createWriter() {
  const options = {
    tone: toneSelect.value,
    length: lengthSelect.value,
    format: formatSelect.value,
    sharedContext: context.value.trim(),
  };

  if (!('Writer' in self)) {
    console.error("Writer model not available in the current context");
    return;
  }
  writerSession = await Writer.create(options);
}

