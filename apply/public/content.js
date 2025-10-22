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
    if (message.type === 'UPDATE_COMPLETION_OPTIONS') {
        if (copilotWriter) {
            copilotWriter.loadCompletionOptions();
            console.log('Completion options updated');
        }
        sendResponse({ success: true });
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



// Class responsible for managing the AI assistant's completion panel and interactions
class CopilotWriter {
    constructor() {
        this.currentElement = null;
        this.completionPanel = null;
        this.currentCompletion = "";
        this.debounceTimer = null;
    this.hideTimer = null; // used to delay hiding the panel
    this.scrollTimer = null; // used for scroll debounce
        this.completionCache = new Map();
        this.isRequesting = false;
        this.mode = 'completion'; // 'completion' , 'writer', 'rewrite'
        this.port = null; // port for messaging with background
        this.isDestroyed = false; // flag to prevent reconnection after destroy
        this.completionOptions = {
            contextLevel: "none",
            maxContextLength: 1000,
            enableContextAware: true
        };
        this.init();
    }

    async init() {
    await this.loadCompletionOptions(); // load configuration
        this.initializePort(); // initialize the port for messaging
        this.createCompletionPanel(); // create the fixed panel
        this.setupGlobalEventListeners();
        console.log('CopilotWriter initialized');
    }

    // Load completion configuration
    async loadCompletionOptions() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['completionOptions'], resolve);
            });
            if (result.completionOptions) {
                this.completionOptions = { ...this.completionOptions, ...result.completionOptions };
            }
            console.log('Completion options loaded:', this.completionOptions);
        } catch (error) {
            console.error('Failed to load completion options:', error);
        }
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
            
            // Cache completed completion results (completion mode only)
            if (this.mode === 'completion' && this.currentCompletion) {
                const context = this.getTextContext();
                const cacheKey = this.generateCacheKey(context);
                this.completionCache.set(cacheKey, this.currentCompletion);
                console.log('Completion cached:', this.currentCompletion);
            }
        }
        if (msg.type === 'STREAM_ABORTED') {
            console.log(`${this.mode} stream aborted by new request`);
            this.isRequesting = false; // Reset request state
            // Don't cache aborted results, just reset the state
        }
        if (msg.type === 'STREAM_ERROR') {
            console.error(`${this.mode} stream error:`, msg.error);
            this.isRequesting = false; // Reset request state
            this.showCompletionPanel('Error generating text. Please try again.');
        }
    }

    // Create the completion panel that follows the input field
    createCompletionPanel() {
        // Creating the main container
        this.completionPanel = document.createElement('div');
        this.completionPanel.id = 'copilot-completion-panel';
        this.completionPanel.style.cssText = `
            position: fixed;
            width: 420px;
            max-height: 300px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
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

        // Content area setup
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            padding: 16px;
            max-height: 220px;
            overflow-y: auto;
        `;

        // Completion text area setup
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

        // Buttons container setup
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 12px;
        `;

        // Accept button setup
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

        // Completion mode button setup
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

        // Rewrite button setup
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

        // Writer button setup
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
        // Close button event
        const closeBtn = document.getElementById('copilot-close-btn');
        closeBtn.addEventListener('click', () => {
            this.hideCompletionPanel();
        });

        // Accept button event
        const acceptBtn = document.getElementById('copilot-accept-btn');
        acceptBtn.addEventListener('click', () => {
            this.acceptCompletion();
        });

        // Completion mode button event
        const completionBtn = document.getElementById('copilot-completion-btn');
        completionBtn.addEventListener('click', () => {
            this.mode = 'completion';
            // Switch to completion mode, hide panel if no content
            if (!this.getTextContext().fullText.trim()) {
                this.hideCompletionPanel();
            } else {
                this.showCompletionPanel('Waiting for completion...');
            }
        });

        // Rewrite button event
        const rewriteBtn = document.getElementById('copilot-rewrite-btn');
        rewriteBtn.addEventListener('click', () => {
            this.mode = 'rewrite';
            this.rewriteFullText();
        });

        // Writer button event
        const writerBtn = document.getElementById('copilot-writer-btn');
        writerBtn.addEventListener('click', () => {
            this.mode = 'writer';
            this.getWriter();
        });

        // Add hover effects
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
        this.handleScrollBound = this.handleScroll.bind(this);

        document.addEventListener('focusin', this.handleFocusInBound);
        document.addEventListener('focusout', this.handleFocusOutBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('click', this.handleClickBound);
    window.addEventListener('scroll', this.handleScrollBound, true); // use capture mode
        window.addEventListener('resize', this.handleScrollBound);
    }

    // Event handler methods
    handleFocusIn(event) {
        if (this.isTextInput(event.target)) {
            this.currentElement = event.target;
            console.log('Focused on text input:', event.target.tagName);

            // clear any pending hide timer
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }

            // show panel depending on the current mode
            if (this.mode === 'completion') {
                this.showCompletionPanel('Ready for text completion...');
                // 如果有文本，则自动请求补全
                const text = this.getTextContext().fullText.trim();
                if (text) {
                    this.showCompletionPanel('Waiting for completion...');
                }
            } else if (this.mode === 'writer' || this.mode === 'rewrite') {
                // In writer and rewrite modes: keep the panel visible if already shown, otherwise show a ready state
                if (this.completionPanel.style.display === 'none') {
                    this.showCompletionPanel(`${this.mode === 'writer' ? 'Writer' : 'Rewrite'} Mode is Ready.`);
                }
            }
        }
    }

    handleFocusOut(event) {
        // Only hide when the newly focused element is not a text input and not inside the panel
        if (this.mode === 'completion' && 
            this.completionPanel && 
            !this.completionPanel.contains(event.target) &&
            !this.isTextInput(event.relatedTarget)) {
            
            // clear any previous hide timer
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
            }
            
            // Delay hiding to allow click events on the panel
            this.hideTimer = setTimeout(() => {
                // Check that there is no active text input and the panel is not hovered
                if (!this.completionPanel.matches(':hover') && 
                    (!document.activeElement || !this.isTextInput(document.activeElement))) {
                    this.hideCompletionPanel();
                }
                this.hideTimer = null;
            }, 300);
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
            }, 1000); // 1 second debounce
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

    handleScroll(event) {
        // Reposition the panel when the page scrolls or the window resizes
        if (this.completionPanel && 
            this.completionPanel.style.display === 'block' && 
            this.currentElement) {
            
            // 使用防抖来避免频繁重新定位
            // use debounce to avoid frequent repositioning
            if (this.scrollTimer) {
                clearTimeout(this.scrollTimer);
            }
            
            this.scrollTimer = setTimeout(() => {
                // Check whether the current element is still visible in the viewport
                const rect = this.currentElement.getBoundingClientRect();
                const isVisible = rect.top >= 0 && 
                                rect.left >= 0 && 
                                rect.bottom <= window.innerHeight && 
                                rect.right <= window.innerWidth;
                
                if (isVisible) {
                    this.positionPanel();
                } else {
                    // 如果输入框不在视口中，隐藏面板
                    // hide the panel if the input is no longer visible
                    this.hideCompletionPanel();
                }
                this.scrollTimer = null;
            }, 16); // ~60fps
        }
    }

    // Main logic to request completion

    // Show the completion panel with given text
    showCompletionPanel(completion) {
        if (!this.completionPanel || !this.completionText) {
            console.log('showCompletionPanel: missing panel or text element', {
                completionPanel: !!this.completionPanel,
                completionText: !!this.completionText
            });
            return;
        }

        console.log('showCompletionPanel: showing panel with text:', completion);
        this.completionText.textContent = completion;
        this.completionPanel.style.display = 'block';

        // Position the panel relative to the current input element
        this.positionPanel();

        // If loading state, disable buttons
        const isLoading = completion === 'loading...';
        const buttons = this.completionPanel.querySelectorAll('button:not(#copilot-close-btn)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
            btn.style.opacity = isLoading ? '0.5' : '1';
        });
    }

    // Position the panel relative to the current input element
    positionPanel() {
        if (!this.currentElement || !this.completionPanel) {
            console.log('positionPanel: missing element or panel', {
                currentElement: !!this.currentElement,
                completionPanel: !!this.completionPanel
            });
            return;
        }

        const rect = this.currentElement.getBoundingClientRect();
        
        // 使用固定定位，这样更稳定
        this.completionPanel.style.position = 'fixed';
        
        // 面板尺寸
        const panelWidth = 420;
        const panelHeight = 300;
        const padding = 8;
        
        // 视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 直接放在输入框的正下方
        let left = rect.left;
        let top = rect.bottom + padding;
        
        // 如果面板宽度超过输入框宽度，居中对齐
        if (panelWidth > rect.width) {
            left = rect.left + (rect.width - panelWidth) / 2;
        }
        
        // 检查右边界，如果超出则向左调整
        if (left + panelWidth > viewportWidth) {
            left = viewportWidth - panelWidth - padding;
        }
        
        // 检查左边界
        if (left < padding) {
            left = padding;
        }
        
        // 检查下边界，如果超出则放到输入框上方
        if (top + panelHeight > viewportHeight) {
            top = rect.top - panelHeight - padding;
            // 如果上方也放不下，则放到视口顶部
            if (top < padding) {
                top = padding;
            }
        }
        
        console.log('positionPanel: positioning below input at', {
            left: left,
            top: top,
            inputRect: {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            },
            viewport: { width: viewportWidth, height: viewportHeight }
        });
        
        this.completionPanel.style.left = `${left}px`;
        this.completionPanel.style.top = `${top}px`;
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
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
            this.scrollTimer = null;
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
        if (this.handleScrollBound) {
            window.removeEventListener('scroll', this.handleScrollBound, true);
            window.removeEventListener('resize', this.handleScrollBound);
            this.handleScrollBound = null;
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

    // Cancel current request - Legacy method kept for potential manual cancellation needs
    // Note: With AbortController implementation, stream interruption is handled automatically 
    // by the backend when new requests arrive. This method mainly resets local state.
    cancelCurrentRequest() {
        if (this.isRequesting) {
            console.log('Manually cancelling current request - resetting local state');
            this.isRequesting = false;
            this.currentCompletion = '';
            this.showCompletionPanel('Request cancelled');
            
            // Note: We don't disconnect the port since backend handles 
            // stream abortion with AbortController. The port stays alive for new requests.
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
        const cacheKey = this.generateCacheKey(context);
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
        this.currentCompletion = ''; // Clear previous completion immediately

        // Show loading state
        this.showCompletionPanel('Loading...');
        console.log('Starting new completion request, text content:', context.fullText.substring(0, 100));
        
        try {
            // Ensure port is initialized
            if (!this.port) {
                await this.initializePort();
            }
            
            // Send streaming request - pass complete context information
            // Note: If there's a previous stream running, background.js will abort it automatically
            await this.sendCompletionRequest(context);
            
        } catch (error) {
            console.error('Error requesting completion:', error);
            this.showCompletionPanel('Completion failed, please try again');
            this.isRequesting = false;
        }
    }

    // Writer connection and streaming
    async getWriter() {
        // No need to manually cancel - backend AbortController handles stream interruption
        this.mode = 'writer';
        this.currentCompletion = '';
        this.isRequesting = true;
        this.showCompletionPanel('Generating content with Writer...');

        console.log('Starting writer stream');

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
        // No need to manually cancel - backend AbortController handles stream interruption
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

    async sendCompletionRequest(context) {
        if (!this.port) {
            await this.initializePort();
        }
        
        try {
            this.port.postMessage({
                type: "COMPLETION_STREAM",
                data: { 
                    prompt: context.fullText,
                    paragraphText: context.paragraphText,  // Send paragraph context separately
                    fullPageText: context.fullPageText,    // Send full page context separately
                    metadata: context.metadata,
                    options: this.completionOptions
                }
            });
            console.log('Completion stream request sent with context level:', this.completionOptions.contextLevel);
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
    // Generate cache key based on context level and actual context used
    generateCacheKey(context) {
        const text = context.fullText.trim();
        
        // Select the appropriate context text based on the current level
        let contextText = '';
        if (this.completionOptions.contextLevel === 'paragraph') {
            contextText = context.paragraphText || '';
        } else if (this.completionOptions.contextLevel === 'fullpage') {
            contextText = context.fullPageText || '';
        }
        
        const combinedText = text + contextText;
        const textHash = this.simpleHash(combinedText);
        return `${this.mode}_${this.completionOptions.contextLevel}_${textHash}_${combinedText.length}`;
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
            return { fullText: '', paragraphText: '', fullPageText: '', metadata: {} };
        }

        // Get current input field text
        const fullText = this.currentElement.value || this.currentElement.textContent || '';
        
        // Always get both paragraph and full page context, let backend choose based on config
        let paragraphText = '';
        let fullPageText = '';
        let metadata = {};

        if (this.completionOptions.enableContextAware && this.completionOptions.contextLevel !== 'none') {
            paragraphText = this.getParagraphContext();
            fullPageText = this.getFullPageContext();
            
            // Apply length limits
            const maxLength = this.completionOptions.maxContextLength;
            if (paragraphText.length > maxLength) {
                paragraphText = paragraphText.substring(0, maxLength) + '...';
            }
            if (fullPageText.length > maxLength) {
                fullPageText = fullPageText.substring(0, maxLength) + '...';
            }
            
            metadata = this.getPageMetadata();
        }

        console.log('Context collected:', {
            fullText: fullText.substring(0, 100) + '...',
            paragraphText: paragraphText.substring(0, 100) + '...',
            fullPageText: fullPageText.substring(0, 100) + '...',
            contextLevel: this.completionOptions.contextLevel,
            metadata
        });

        return { fullText, paragraphText, fullPageText, metadata };
    }

    // Get paragraph-level context
    getParagraphContext() {
        if (!this.currentElement) return '';

        try {
            // Try to find the nearest semantic container for paragraph context
            let contextElement = this.currentElement.closest('p, div, section, article, main');
            
            // Fallback to parent element if no semantic container is found
            if (!contextElement) {
                contextElement = this.currentElement.parentElement;
            }
            
            if (contextElement) {
                // Extract paragraph text and exclude the current input's content
                const paragraphText = this.getCleanText(contextElement);
                return paragraphText;
            }
        } catch (error) {
            console.warn('Error getting paragraph context:', error);
        }

        return '';
    }

    // Get full page context
    getFullPageContext() {
        try {
            // Get main content area of the page
            const mainContent = document.querySelector('main, article, .content, #content, .main') || document.body;
            
            // Get page title
            const pageTitle = document.title || '';
            
            // Get main text content
            const bodyText = this.getCleanText(mainContent);
            
            // Combine context
            let context = '';
            if (pageTitle) {
                context += `Title: ${pageTitle}\n\n`;
            }
            context += bodyText;

            return context;
        } catch (error) {
            console.warn('Error getting full page context:', error);
            return '';
        }
    }

    // Get cleaned text content
    getCleanText(element) {
        if (!element) return '';

        // Clone element to avoid modifying original DOM
        const clone = element.cloneNode(true);

        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe', 'embed', 'object',
            'nav', 'header', 'footer', 'aside', '.advertisement', '.ad',
            'input', 'textarea', 'button', 'select'
        ];

        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Get text and clean it
        let text = clone.textContent || clone.innerText || '';
        
        // Clean excessive whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    // Get page metadata
    getPageMetadata() {
        const metadata = {};

        try {
            // Get page title
            metadata.title = document.title || '';

            // Get meta description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metadata.description = metaDescription.getAttribute('content') || '';
            }

            // Get page language
            metadata.language = document.documentElement.lang || 'en';

            // Get page URL type
            metadata.domain = window.location.hostname;
            metadata.path = window.location.pathname;

            // Detect content type
            if (window.location.hostname.includes('github.com')) {
                metadata.contentType = 'code';
            } else if (window.location.hostname.includes('stackoverflow.com')) {
                metadata.contentType = 'technical';
            } else if (document.querySelector('article, .post, .blog')) {
                metadata.contentType = 'article';
            } else {
                metadata.contentType = 'general';
            }

        } catch (error) {
            console.warn('Error getting page metadata:', error);
        }

        return metadata;
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
