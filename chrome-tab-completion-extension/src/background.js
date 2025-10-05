// Copilot Web Background Service Worker
let aiSession = null;
let isAIReady = false;
let aiDefaults = null;
let sessionKeepAlive = null;

// Keep extension context alive
function keepContextAlive() {
  if (sessionKeepAlive) {
    clearInterval(sessionKeepAlive);
  }
  
  sessionKeepAlive = setInterval(() => {
    // Ping to keep service worker alive
    chrome.runtime.getPlatformInfo(() => {
      if (chrome.runtime.lastError) {
        console.warn('Extension context may be invalidated');
      }
    });
  }, 25000); // Every 25 seconds
}

// Check if extension context is still valid
function isContextValid() {
  try {
    return !chrome.runtime.lastError && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Copilot Web extension installed');
  
  // Start keep-alive mechanism
  keepContextAlive();
  
  // Enable side panel
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  
  // Initialize AI
  await initDefaults();
  
  // Set default storage values
  await chrome.storage.local.set({
    contextRules: '',
    isEnabled: true,
    completionSettings: {
      maxTokens: 100,
      temperature: 0.3,
      debounceMs: 500
    }
  });
});

// Also start keep-alive on startup
chrome.runtime.onStartup.addListener(() => {
  keepContextAlive();
  initDefaults();
});

// Initialize AI defaults (based on reference implementation)
async function initDefaults() {
  try {
    if (!('LanguageModel' in self)) {
      console.warn('LanguageModel not available');
      isAIReady = false;
      return;
    }
    
    aiDefaults = await LanguageModel.params();
    console.log('AI model defaults:', aiDefaults);
    isAIReady = true;
    console.log('AI available and ready');
  } catch (error) {
    console.error('Failed to initialize AI:', error);
    isAIReady = false;
  }
}

// Reset AI session
async function resetAISession() {
  if (aiSession) {
    aiSession.destroy();
  }
  aiSession = null;
}

// Create AI session with parameters and retry logic
async function createAISession(params, retryCount = 0) {
  const maxRetries = 2;
  
  if (!isContextValid()) {
    throw new Error('Extension context invalidated');
  }
  
  if (!isAIReady) {
    await initDefaults();
    if (!isAIReady) {
      throw new Error('AI not available');
    }
  }
  
  try {
    // Always create a fresh session for better reliability
    if (aiSession) {
      try {
        aiSession.destroy();
      } catch (e) {
        console.warn('Error destroying previous session:', e);
      }
      aiSession = null;
    }
    
    // Create session with timeout
    const sessionPromise = LanguageModel.create(params);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session creation timeout')), 10000);
    });
    
    aiSession = await Promise.race([sessionPromise, timeoutPromise]);
    return aiSession;
    
  } catch (error) {
    console.error(`Session creation failed (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries && isContextValid()) {
      console.log('Retrying session creation...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return createAISession(params, retryCount + 1);
    }
    
    throw error;
  }
}

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    sendResponse({ error: 'Invalid message format' });
    return false;
  }
  
  console.log('Received message:', message.type);
  
  switch (message.type) {
    case 'AI_COMPLETION':
      (async () => {
        try {
          await handleAICompletion(message.data, sendResponse);
        } catch (error) {
          console.error('AI_COMPLETION error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true; // Keep message channel open for async response
      
    case 'CHAT_WITH_AI':
      (async () => {
        try {
          await handleAIChat(message.data, sendResponse);
        } catch (error) {
          console.error('CHAT_WITH_AI error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true;
      
    case 'GET_CONTEXT_RULES':
      (async () => {
        try {
          await handleGetContextRules(sendResponse);
        } catch (error) {
          console.error('GET_CONTEXT_RULES error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true;
      
    case 'SET_CONTEXT_RULES':
      (async () => {
        try {
          await handleSetContextRules(message.data, sendResponse);
        } catch (error) {
          console.error('SET_CONTEXT_RULES error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true;
      
    case 'GET_AI_STATUS':
      sendResponse({ isReady: isAIReady });
      return false; // Synchronous response
      
    case 'GET_DIAGNOSTIC_INFO':
      (async () => {
        try {
          await handleGetDiagnosticInfo(sendResponse);
        } catch (error) {
          console.error('GET_DIAGNOSTIC_INFO error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type: ' + message.type });
      return false;
  }
});

// Get diagnostic information
async function handleGetDiagnosticInfo(sendResponse) {
  try {
    const diagnosticInfo = {
      isAIReady,
      chromeVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
      languageModelAvailable: 'LanguageModel' in self,
      userAgent: navigator.userAgent
    };
    
    sendResponse({ success: true, data: diagnosticInfo });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

// Handle AI completion for text completion
async function handleAICompletion(data, sendResponse) {
  if (!isContextValid()) {
    sendResponse({ error: 'Extension context invalidated' });
    return;
  }
  
  if (!isAIReady) {
    sendResponse({ error: 'AI is not ready' });
    return;
  }
  
  try {
    const { context, currentText, cursorPosition } = data;
    
    // Get user's context rules with timeout
    const storagePromise = chrome.storage.local.get(['contextRules']);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Storage timeout')), 2000);
    });
    
    const storage = await Promise.race([storagePromise, timeoutPromise]);
    const contextRules = storage.contextRules || '';
    
    // Build prompt for completion
    const prompt = buildCompletionPrompt(context, currentText, cursorPosition, contextRules);
    
    // Create session parameters
    const params = {
      initialPrompts: [
        { role: 'system', content: 'You are a helpful coding assistant that provides concise text completions. Only return the completion text, nothing else.' }
      ],
      temperature: aiDefaults?.defaultTemperature || 0.3,
      topK: 3
    };
    
    // Create session with retry logic
    const session = await createAISession(params);
    
    // Check context again before prompting
    if (!isContextValid()) {
      throw new Error('Extension context invalidated during session creation');
    }
    
    // AI prompt with timeout (shorter timeout for better UX)
    const promptPromise = session.prompt(prompt);
    const promptTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI response timeout')), 8000); // 8 second timeout
    });
    
    const completion = await Promise.race([promptPromise, promptTimeoutPromise]);
    
    // Final context check before responding
    if (!isContextValid()) {
      throw new Error('Extension context invalidated during AI processing');
    }
    
    sendResponse({ 
      success: true, 
      completion: completion.trim(),
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('AI completion error:', error);
    
    // Reset session on error
    await resetAISession();
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.message.includes('context invalidated')) {
      errorMessage = 'Extension needs to be reloaded';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out, please try again';
    } else if (error.message.includes('not available')) {
      errorMessage = 'AI is not available';
    }
    
    sendResponse({ error: errorMessage });
  }
}

// Handle AI chat for side panel
async function handleAIChat(data, sendResponse) {
  if (!isContextValid()) {
    sendResponse({ error: 'Extension context invalidated' });
    return;
  }
  
  if (!isAIReady) {
    sendResponse({ error: 'AI is not ready' });
    return;
  }
  
  try {
    const { message, chatHistory } = data;
    
    // Build initial prompts with chat history
    const initialPrompts = [
      { role: 'system', content: 'You are a helpful and friendly coding assistant. Provide clear, concise responses.' }
    ];
    
    // Add recent chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.slice(-8).forEach(msg => {
        initialPrompts.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    // Create new session for chat (don't reuse completion session)
    const params = {
      initialPrompts,
      temperature: aiDefaults?.defaultTemperature || 0.7,
      topK: aiDefaults?.defaultTopK || 5
    };
    
    // Create session with timeout
    const chatSession = await createAISession(params);
    
    // Check context before prompting
    if (!isContextValid()) {
      throw new Error('Extension context invalidated during session creation');
    }
    
    // Chat with timeout
    const responsePromise = chatSession.prompt(message);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chat response timeout')), 15000); // 15 second timeout for chat
    });
    
    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    // Clean up chat session immediately
    try {
      chatSession.destroy();
    } catch (e) {
      console.warn('Error destroying chat session:', e);
    }
    
    // Final context check
    if (!isContextValid()) {
      throw new Error('Extension context invalidated during chat processing');
    }
    
    sendResponse({ 
      success: true, 
      response: response.trim(),
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('AI chat error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.message.includes('context invalidated')) {
      errorMessage = 'Extension needs to be reloaded';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Response timed out, please try again';
    }
    
    sendResponse({ error: errorMessage });
  }
}

// Get context rules from storage
async function handleGetContextRules(sendResponse) {
  try {
    const storage = await chrome.storage.local.get(['contextRules']);
    sendResponse({ 
      success: true, 
      contextRules: storage.contextRules || '' 
    });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

// Set context rules to storage
async function handleSetContextRules(data, sendResponse) {
  try {
    await chrome.storage.local.set({ contextRules: data.contextRules });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

// Build completion prompt
function buildCompletionPrompt(context, currentText, cursorPosition, contextRules) {
  let prompt = "Complete the following text naturally and contextually. ";
  
  if (contextRules) {
    prompt += `Follow these rules: ${contextRules}\n\n`;
  }
  
  prompt += "Context around the cursor:\n";
  prompt += `Before cursor: "${context.before}"\n`;
  prompt += `After cursor: "${context.after}"\n`;
  prompt += `Current text: "${currentText}"\n\n`;
  prompt += "Provide only the completion text that should be inserted at the cursor position. ";
  prompt += "Keep it concise and relevant. Don't repeat the existing text.\n\n";
  prompt += "Completion:";
  
  return prompt;
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Clean up AI session when extension is disabled
chrome.runtime.onSuspend.addListener(async () => {
  await resetAISession();
  isAIReady = false;
});