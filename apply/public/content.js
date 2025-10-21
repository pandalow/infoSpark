async function saveAllPageTextToStorage() {
    // Acquire all visible text from the page
    function getAllVisibleText(node) {
        let text = '';
        if (node.nodeType === Node.TEXT_NODE) {
            // Filter out whitespace
            if (node.textContent.trim()) {
                text += node.textContent.trim() + ' ';
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Ignore script, style, noscript, etc.
            const tag = node.tagName && node.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'canvas', 'iframe'].includes(tag)) return '';
            // Only traverse visible elements
            const style = window.getComputedStyle(node);
            if (style && (style.display === 'none' || style.visibility === 'hidden')) return '';
            for (let child of node.childNodes) {
                text += getAllVisibleText(child);
            }
        }
        return text;
    }

    const allText = getAllVisibleText(document.body).replace(/\s+/g, ' ').trim();
    // Store to chrome.storage.local
    chrome.storage.local.set({ pageTextSnapshot: allText }, () => {
        if (chrome.runtime.lastError) {
            console.error('Failed to save page text:', chrome.runtime.lastError);
        } else {
            console.log('Page text saved to chrome.storage.local as "pageTextSnapshot"');
        }
    });
}

// CopilotWriter Instance Management
let copilotWriter = null;

// Using a namespace to avoid global variable conflicts
const CopilotWriterManager = {
    instance: null,

    getInstance() {
        if (!this.instance) {
            this.instance = new CopilotWriter();
        }
        return this.instance;
    },

    destroyInstance() {
        if (this.instance) {
            console.log('Destroying CopilotWriter instance');
            this.instance.destroy();
            this.instance = null;
        }
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'INIT_COPILOT_WRITER') {
        try {
            copilotWriter = CopilotWriterManager.getInstance();
            sendResponse({ success: true, message: 'CopilotWriter initialized' });
        } catch (error) {
            console.error('Failed to initialize CopilotWriter:', error);
            sendResponse({ success: false, message: 'Failed to initialize' });
        }
    }
    if (message.type === 'DESTROY_COPILOT_WRITER') {
        try {
            CopilotWriterManager.destroyInstance();
            copilotWriter = null;
            sendResponse({ success: true, message: 'CopilotWriter destroyed' });
        } catch (error) {
            sendResponse({ success: false, message: 'Failed to destroy' });
        }
    }
    if (message.type === 'CHECK_COPILOT_STATUS') {
        const isActive = copilotWriter !== null;
        sendResponse({ success: true, isActive });
    }
});

// When the content script loads, check if Copilot is enabled and initialize if so.
function initializeCopilotIfEnabled() {
    setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'GET_COPILOT_STATUS' }, (response) => {
            if (chrome.runtime.lastError) {
                return;
            }
            if (response && response.success && response.data && response.data.isEnabled) {
                try {
                    copilotWriter = CopilotWriterManager.getInstance();
                } catch (error) {
                    console.error('Failed to auto-initialize CopilotWriter:', error);
                }
            } else {
                console.log('Copilot not enabled or failed to get status:', response);
            }
        });
    }, 200); // Slight delay to ensure background script is ready
}

function init() {
    saveAllPageTextToStorage();
    initializeCopilotIfEnabled();
}

if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.log('DOM already loaded, initializing immediately');
    init();
}

// listen for window load event as a fallback
window.addEventListener('load', () => {
    console.log('Window load event fired');
    // If not initialized yet, try again
    if (!copilotWriter) {
        setTimeout(initializeCopilotIfEnabled, 100);
    }
});



class CopilotWriter {
    constructor() {
        this.currentElement = null;
        this.completionPanel = null;
        this.currentCompletion = "";
        this.debounceTimer = null;
        this.completionCache = new Map();
        this.isRequesting = false;
        this.mode = 'completion'; // 'completion' , 'writer', 'rewrite'
        this.port = null; // port for messaging with background
        this.isDestroyed = false; // flag to prevent reconnection after destroy
        this.init();
    }

    async init() {
        this.initializePort(); // initialize the port for messaging
        this.createCompletionPanel(); // create the fixed panel
        this.setupGlobalEventListeners();
        console.log('CopilotWriter initialized');
    }

    // Handle incoming messages from the port
    handlePortMessage(msg) {
        if (msg.type === 'STREAM_CHUNK') {
            this.currentCompletion += msg.data.chunk;
            this.showCompletionPanel(this.currentCompletion);
        }
        if (msg.type === 'STREAM_END') {
            console.log(`${this.mode} stream ended`);
            this.isRequesting = false; // Reset request state
            
            // 缓存完成的补全结果（仅限 completion 模式）
            if (this.mode === 'completion' && this.currentCompletion) {
                const context = this.getTextContext();
                const cacheKey = this.generateCacheKey({ fullText: context.fullText.trim() });
                this.completionCache.set(cacheKey, this.currentCompletion);
                console.log('Completion cached:', this.currentCompletion);
            }
        }
        if (msg.type === 'STREAM_ERROR') {
            console.error(`${this.mode} stream error:`, msg.error);
            this.isRequesting = false; // Reset request state
            this.showCompletionPanel('Error generating text. Please try again.');
        }
    }

    // Creating the fixed completion panel  
    createCompletionPanel() {
        // Creating the main container
        this.completionPanel = document.createElement('div');
        this.completionPanel.id = 'copilot-completion-panel';
        this.completionPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 350px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 16px;
            box-shadow: 0 8px 32px 0 rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8);
            z-index: 999999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            display: none;
            overflow: hidden;
        `;

        // Title bar
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 12px 16px;
            font-weight: 600;
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        `;
        titleBar.innerHTML = `
            <span>InfoSpark AI Assistant</span>
            <button id="copilot-close-btn" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                cursor: pointer;
                font-size: 14px;
                padding: 4px 8px;
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
        `;

        // content area
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            padding: 16px;
            max-height: 220px;
            overflow-y: auto;
        `;

        // Completion text area
        this.completionText = document.createElement('div');
        this.completionText.id = 'copilot-completion-text';
        this.completionText.style.cssText = `
            color: #1e40af;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin-bottom: 16px;
            min-height: 60px;
            background: rgba(255, 255, 255, 0.8);
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(59, 130, 246, 0.2);
            backdrop-filter: blur(10px);
        `;
        this.completionText.textContent = 'Processing...';

        // Buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 12px;
        `;

        // Creating the accept button
        const acceptButton = document.createElement('button');
        acceptButton.id = 'copilot-accept-btn';
        acceptButton.textContent = 'Accept';
        acceptButton.style.cssText = `
            flex: 1;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            border: none;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        `;
        acceptButton.addEventListener('mouseover', () => {
            acceptButton.style.transform = 'translateY(-1px)';
            acceptButton.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
        });
        acceptButton.addEventListener('mouseout', () => {
            acceptButton.style.transform = 'translateY(0)';
            acceptButton.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
        });

        // Completion mode button
        const completionButton = document.createElement('button');
        completionButton.id = 'copilot-completion-btn';
        completionButton.textContent = 'Completion';
        completionButton.style.cssText = `
            flex: 1;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            border: none;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        `;
        completionButton.addEventListener('mouseover', () => {
            completionButton.style.transform = 'translateY(-1px)';
            completionButton.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
        });
        completionButton.addEventListener('mouseout', () => {
            completionButton.style.transform = 'translateY(0)';
            completionButton.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        });

        // Rewrite button
        const rewriteButton = document.createElement('button');
        rewriteButton.id = 'copilot-rewrite-btn';
        rewriteButton.textContent = 'Rewrite';
        rewriteButton.style.cssText = `
            flex: 1;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        `;
        rewriteButton.addEventListener('mouseover', () => {
            rewriteButton.style.transform = 'translateY(-1px)';
            rewriteButton.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
        });
        rewriteButton.addEventListener('mouseout', () => {
            rewriteButton.style.transform = 'translateY(0)';
            rewriteButton.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
        });

        // Writer button
        const writerButton = document.createElement('button');
        writerButton.id = 'copilot-writer-btn';
        writerButton.textContent = 'Writer';
        writerButton.style.cssText = `
            flex: 1;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        `;
        writerButton.addEventListener('mouseover', () => {
            writerButton.style.transform = 'translateY(-1px)';
            writerButton.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
        });
        writerButton.addEventListener('mouseout', () => {
            writerButton.style.transform = 'translateY(0)';
            writerButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        });

        // Assemble panel
        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(completionButton);
        buttonContainer.appendChild(rewriteButton);
        buttonContainer.appendChild(writerButton);

        contentArea.appendChild(this.completionText);
        contentArea.appendChild(buttonContainer);

        this.completionPanel.appendChild(titleBar);
        this.completionPanel.appendChild(contentArea);

        document.body.appendChild(this.completionPanel);

        // Bind events
        this.setupPanelEvents();
    }

    // Setup panel events
    setupPanelEvents() {
        // close button
        const closeBtn = document.getElementById('copilot-close-btn');
        closeBtn.addEventListener('click', () => {
            this.hideCompletionPanel();
        });

        // Accept button
        const acceptBtn = document.getElementById('copilot-accept-btn');
        acceptBtn.addEventListener('click', () => {
            this.acceptCompletion();
        });

        // Completion mode button
        const completionBtn = document.getElementById('copilot-completion-btn');
        completionBtn.addEventListener('click', () => {
            this.mode = 'completion';
            // Switch to completion mode, hide panel if no content --- IGNORE ---
            if (!this.getTextContext().fullText.trim()) {
                this.hideCompletionPanel();
            } else {
                this.showCompletionPanel('等待补全内容...');
            }
        });

        // Rewrite button
        const rewriteBtn = document.getElementById('copilot-rewrite-btn');
        rewriteBtn.addEventListener('click', () => {
            this.mode = 'rewrite';
            this.rewriteFullText();
        });

        // Writer button
        const writerBtn = document.getElementById('copilot-writer-btn');
        writerBtn.addEventListener('click', () => {
            this.mode = 'writer';
            this.getWriter();
        });

        // Add hover effect
        [acceptBtn, rewriteBtn, writerBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.opacity = '0.8';
                btn.style.transform = 'translateY(-1px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.opacity = '1';
                btn.style.transform = 'translateY(0)';
            });
        });
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        this.handleFocusInBound = this.handleFocusIn.bind(this);
        this.handleFocusOutBound = this.handleFocusOut.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleClickBound = this.handleClick.bind(this);

        document.addEventListener('focusin', this.handleFocusInBound);
        document.addEventListener('focusout', this.handleFocusOutBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('click', this.handleClickBound);
    }

    // Event handler methods
    handleFocusIn(event) {
        if (this.isTextInput(event.target)) {
            this.currentElement = event.target;
            console.log('Focused on text input:', event.target.tagName);

            // 根据不同模式显示面板
            if (this.mode === 'completion') {
                const text = this.getTextContext().fullText.trim();
                if (text) {
                    this.showCompletionPanel('Waiting for completion...');
                }
            } else if (this.mode === 'writer' || this.mode === 'rewrite') {
                // Writer和Rewrite模式下，如果面板已经显示则保持，否则显示准备状态
                if (this.completionPanel.style.display === 'none') {
                    this.showCompletionPanel(`${this.mode === 'writer' ? 'Writer' : 'Rewrite'} Mode is Ready.`);
                }
            }
        }
    }

    handleFocusOut(event) {
        if (this.mode === 'completion' && this.completionPanel &&
            !this.completionPanel.contains(event.target)) {
            // Delay hiding to allow click events on panel
            setTimeout(() => {
                if (!this.completionPanel.matches(':hover')) {
                    this.hideCompletionPanel();
                }
            }, 200);
        }
    }

    handleKeyDown(event) {
        if (!this.currentElement) return;

        // Tab key accepts completion
        if (event.key === 'Tab' && this.currentCompletion && this.completionPanel.style.display === 'block') {
            event.preventDefault();
            this.acceptCompletion();
            return;
        }

        // Escape key hides panel
        if (event.key === 'Escape' && this.completionPanel.style.display === 'block') {
            event.preventDefault();
            this.hideCompletionPanel();
            return;
        }
    }

    handleInput(event) {
        if (!this.currentElement || event.target !== this.currentElement) {
            return;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        if (this.mode === 'completion') {
            console.log('Input detected, scheduling completion request');
            this.debounceTimer = setTimeout(() => {
                this.requestCompletion();
            }, 1000); // 1 秒
        }
    }

    handleClick(event) {
        // Only hide panel automatically in completion mode
        // Writer and Rewrite modes require manual closing
        if (this.mode === 'completion' &&
            this.completionPanel &&
            !this.completionPanel.contains(event.target) &&
            event.target !== this.currentElement) {
            this.hideCompletionPanel();
        }
    }

    // Main logic to request completion

    // Show the completion panel with given text
    showCompletionPanel(completion) {
        if (!this.completionPanel || !this.completionText) return;

        this.completionText.textContent = completion;
        this.completionPanel.style.display = 'block';

        // If loading state, disable buttons
        const isLoading = completion === 'loading...';
        const buttons = this.completionPanel.querySelectorAll('button:not(#copilot-close-btn)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
            btn.style.opacity = isLoading ? '0.5' : '1';
        });
    }

    // Hide the completion panel
    hideCompletionPanel() {
        if (this.completionPanel) {
            this.completionPanel.style.display = 'none';
        }
        this.currentCompletion = '';
    }

    // Accept the current completion and insert it into the text field
    acceptCompletion() {
        if (!this.currentCompletion || !this.currentElement) {
            return;
        }

        const currentText = this.currentElement.value || this.currentElement.textContent || '';

        let newText = '';

        if (this.mode === 'completion') {
            newText = currentText + this.currentCompletion;
        } else {
            newText = this.currentCompletion;
        }

        if (this.currentElement.value !== undefined) {
            this.currentElement.value = newText;
        } else {
            this.currentElement.textContent = newText;
        }

        // Only hide panel in completion mode
        // Writer/Rewrite modes keep the panel open for further generation
        if (this.mode === 'completion') {
            this.hideCompletionPanel();
        } else {
            // Writer/Rewrite mode: clear currentCompletion but keep panel open
            this.currentCompletion = '';
            this.showCompletionPanel('Content inserted, you can continue generating more content...');
        }

        this.currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        this.currentElement.focus();
    }

    // Destroy the CopilotWriter instance
    destroy() {
        // Set destroy flag to prevent reconnection
        this.isDestroyed = true;

        // Clear timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // Disconnect port
        if (this.port) {
            try {
                this.port.disconnect();
            } catch (error) {
                console.log('Port already disconnected:', error);
            }
            this.port = null;
        }

        // Remove completion panel DOM element
        if (this.completionPanel && this.completionPanel.parentNode) {
            this.completionPanel.parentNode.removeChild(this.completionPanel);
            this.completionPanel = null;
        }

        // Remove global event listeners
        if (this.handleFocusInBound) {
            document.removeEventListener('focusin', this.handleFocusInBound);
            this.handleFocusInBound = null;
        }
        if (this.handleFocusOutBound) {
            document.removeEventListener('focusout', this.handleFocusOutBound);
            this.handleFocusOutBound = null;
        }
        if (this.handleKeyDownBound) {
            document.removeEventListener('keydown', this.handleKeyDownBound);
            this.handleKeyDownBound = null;
        }
        if (this.handleInputBound) {
            document.removeEventListener('input', this.handleInputBound);
            this.handleInputBound = null;
        }
        if (this.handleClickBound) {
            document.removeEventListener('click', this.handleClickBound);
            this.handleClickBound = null;
        }

        // Clear cache
        this.completionCache.clear();

        // Reset state
        this.currentElement = null;
        this.currentCompletion = '';
        this.completionText = null;
        this.isRequesting = false;

        console.log('CopilotWriter destroyed');
    }


    

    // Cancel current request
    cancelCurrentRequest() {
        if (this.isRequesting) {
            this.isRequesting = false;
            this.currentCompletion = '';

            // If there is an active port connection, disconnect it to stop streaming
            if (this.port) {
                try {
                    this.port.disconnect();
                } catch (error) {
                    console.log('Port already disconnected:', error);
                }
                this.port = null;
            }

            console.log('Current request cancelled');
        }
    }

    async requestCompletion() {
        if (!this.currentElement || this.isRequesting) {
            console.log('Request skipped: no element, disabled, or already requesting');
            return;
        }
        
        const context = this.getTextContext();
        const fullText = context.fullText.trim();

        if (!fullText) {
            console.log('Request skipped: empty input');
            this.hideCompletionPanel();
            return;
        }

        // Check cache
        const cacheKey = this.generateCacheKey({ fullText });
        if (this.completionCache.has(cacheKey)) {
            const cachedCompletion = this.completionCache.get(cacheKey);
            this.currentCompletion = cachedCompletion;
            this.showCompletionPanel(cachedCompletion);
            console.log('Using cached completion');
            return;
        }

        // Queue management
        if (this.completionCache.size >= 50) {
            console.log('Cache is full, removing oldest entry');
            const firstKey = this.completionCache.keys().next().value;
            this.completionCache.delete(firstKey);
        }

        this.isRequesting = true;
        this.currentCompletion = '';

        // Show loading state
        this.showCompletionPanel('Loading...');
        console.log('Sending completion request, text content:', fullText);
        
        try {
            // 确保端口已初始化
            if (!this.port) {
                await this.initializePort();
            }
            
            // 发送流式请求 - 不需要等待返回值，通过 handlePortMessage 处理响应
            await this.sendCompletionRequest(fullText);
            
        } catch (error) {
            console.error('Error requesting completion:', error);
            this.showCompletionPanel('Completion failed, please try again');
            this.isRequesting = false;
        }
        // 注意：不在这里设置 isRequesting = false，因为流式响应会在 handlePortMessage 中处理
    }

    // Writer connection and streaming
    async getWriter() {
        if (this.isRequesting) {
            console.log('Cancelling current request to start Writer');
            this.cancelCurrentRequest();
        }

        this.mode = 'writer';
        this.currentCompletion = '';
        this.isRequesting = true;
        this.showCompletionPanel('Generating content with Writer...');

        console.log('Sending WRITER_STREAM message, port:', this.port);

        try {
            if (!this.port) {
                await this.initializePort();
            }
            this.sendWriterRequest();
        } catch (error) {
            this.handleWriterError('Failed to establish connection');
        }
    }

    // Send writer request through port
    sendWriterRequest() {
        try {
            this.port.postMessage({
                type: 'WRITER_STREAM',
                data: { prompt: this.getTextContext().fullText }
            });
        } catch (error) {
            console.error('Error sending writer request:', error);
            this.handleWriterError('Failed to send request');
        }
    }

    handleWriterError(errorMessage) {
        this.isRequesting = false;
        this.showCompletionPanel(`Writer错误: ${errorMessage}`);
    }

    // Full text rewrite connection and streaming
    async rewriteFullText() {
        if (this.isRequesting) {
            console.log('Cancelling current request to start Rewriter');
            this.cancelCurrentRequest();
        }

        this.mode = 'rewrite';
        this.currentCompletion = '';
        this.isRequesting = true;
        this.showCompletionPanel('Rewriting full text...');

        try {
            if (!this.port) {
                await this.initializePort();
            }
            this.sendRewriteRequest();
        } catch (error) {
            this.handleRewriteError('Failed to establish connection');
        }
    }
    // Send rewrite request through port
    sendRewriteRequest() {
        try {
            console.log('Sending REWRITER_STREAM message, port:', this.port);
            this.port.postMessage({
                type: 'REWRITER_STREAM',
                data: { prompt: this.getTextContext().fullText }
            });
        } catch (error) {
            console.error('Error sending rewrite request:', error);
            this.handleRewriteError('Failed to send request');
        }
    }

    handleRewriteError(errorMessage) {
        this.isRequesting = false;
        this.showCompletionPanel(`REWRITE ERROR: ${errorMessage}`);
    }

    async sendCompletionRequest(prompt) {
        if (!this.port) {
            await this.initializePort();
        }
        
        try {
            this.port.postMessage({
                type: "COMPLETION_STREAM",
                data: { prompt }
            });
            console.log('Completion stream request sent');
        } catch (error) {
            console.error('Error sending completion request:', error);
            throw error;
        }
    }

    async enableCompletion() {
        const response = await chrome.runtime.sendMessage({
            type: "ENABLE_COMPLETION",
            data: {}
        });
        return response;
    }

    async initializePort() {
        if (this.port) return this.port;
        
        return new Promise((resolve, reject) => {
            try {
                this.port = chrome.runtime.connect({ name: "AI_WRITER_STREAM" });
                
                this.port.onMessage.addListener((msg) => {
                    this.handlePortMessage(msg);
                });
                
                this.port.onDisconnect.addListener(() => {
                    console.log('Port disconnected, last error:', chrome.runtime.lastError);
                    this.port = null;
                    this.isRequesting = false;
                    
                    // 添加重连条件判断，避免无限重连
                    if (!this.isDestroyed && chrome.runtime.lastError && 
                        !chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                        console.log('Attempting to reconnect in 2 seconds...');
                        setTimeout(() => this.initializePort(), 2000);
                    }
                });
                
                resolve(this.port);
            } catch (error) {
                console.error('Failed to initialize port:', error);
                this.port = null;
                reject(error);
            }
        });
    }

    // Keep a hash for caching
    generateCacheKey(context) {
        const text = context.fullText.trim();
        const textHash = this.simpleHash(text);
        return `${this.mode}_${textHash}_${text.length}`;
    }

    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    getTextContext() {
        if (!this.currentElement) {
            return { fullText: '' };
        }
        const text = this.currentElement.value || this.currentElement.textContent || '';
        console.log('Full text:', text);
        return { fullText: text };

    }

    getCursorPosition() {
        if (!this.currentElement) return 0;


        if (this.currentElement.selectionStart !== undefined) {
            return this.currentElement.selectionStart;
        }

        if (this.currentElement.contentEditable === 'true') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                return selection.getRangeAt(0).startOffset;
            }
        }
    }

    isTextInput(element) {
        if (!element || !element.tagName) return false;

        const tag = element.tagName.toLowerCase();
        const type = (element.type || '').toLowerCase();

        return (
            tag === 'textarea' ||
            (tag === 'input' && ['text', 'email', 'search', 'url', 'password'].includes(type)) ||
            element.contentEditable === 'true'
        );
    }
}
