let isPromptAvailable = "unknown"
let isWriterAvailable = "unknown"
let promptSession = null;
let writerSession = null;


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

class PortManager {

  constructor() {
    this.port = new Map();
    this.requestId = 0;
  }

}

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


messageManager.addListener('CHAT_WITH_AI', async (data, sender) => {
  return await handleAIChat(data);
});

messageManager.addListener('CHECK_STATUS', async () => {
  return await getAIStatus();
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageManager.handleMessage(message, sender, sendResponse);
  return true;
});



// Function
async function aiInitStatus() {
  const promptAvailability = await checkingAvailability("PROMPT");
  isPromptAvailable = promptAvailability
  const writerAvailability = await checkingAvailability("WRITER");
  isWriterAvailable = writerAvailability
}

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


async function createPromptSession(params, retryCount = 0) {

  if (promptSession) {
    try {
      promptSession.destroy();
    } catch (err) {
      console.warn('Error destroying prompt session', err);
    }
    promptSession = null;
  }

  let sessionPromise;
  const availability = await checkingAvailability("PROMPT");

  if (availability === "available") {
    sessionPromise = LanguageModel.create(params);
  } else if (availability === "downloadable" || availability === "downloading") {
    sessionPromise = LanguageModel.create({
      monitor(m) {
        m.addEventListener('download progress', (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
      ...params
    });
  } else {
    throw new Error(`Language model is not available. Current status: ${availability}`);
  }
  // 增加一个超时竞争逻辑, 用于预判如果出现创建超时, 返回报错信息.
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() =>
      reject(new Error('Session creation timeout')), 30000); // 增加超时时间
  });

  try {
    promptSession = await Promise.race([sessionPromise, timeoutPromise]);
    return promptSession;
  } catch (error) {
    throw error;
  }
}



async function handleAIChat(data) {
  const { message, chatHistory } = data;

  // 先定义 initialPrompts
  const initialPrompts = [
    {
      role: 'system',
      content: 'You are a helpful and friendly coding assistant. Provide clear, concise responses.'
    }
  ];

  if (chatHistory && chatHistory.length > 0) {
    chatHistory.slice(-8).forEach(msg => {
      initialPrompts.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
  }

  if (!promptSession) {
    const params = {
      initialPrompts,
      temperature: 0.7,
      topK: 5
    };
    await createPromptSession(params);
  }

  const responsePromise = promptSession.prompt(message);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Chat response timeout')), 30000);
  });

  const response = await Promise.race([responsePromise, timeoutPromise]);

  return {
    response: response.trim(),
    timestamp: Date.now()
  };
}

