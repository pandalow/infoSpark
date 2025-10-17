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

// Adding listeners to initialize CopilotWriter at the right time
console.log('Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeCopilotIfEnabled);
} else {
    console.log('DOM already loaded, initializing immediately');
    initializeCopilotIfEnabled();
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
        this.saveAllPageTextToStorage();
        this.init();
    }

    async init() {
        this.initializePort(); // initialize the port for messaging
        this.createCompletionPanel(); // create the fixed panel
        this.setupGlobalEventListeners();
        console.log('CopilotWriter initialized');
    }

    // 处理来自 port 的消息
    handlePortMessage(msg) {
        if (msg.type === 'STREAM_CHUNK') {
            this.currentCompletion += msg.data.chunk;
            this.showCompletionPanel(this.currentCompletion);
        }
        if (msg.type === 'STREAM_END') {
            console.log(`${this.mode} stream ended`);
            this.isRequesting = false; // Reset request state
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

        // 创建全文重写按钮
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

        // 创建Writer按钮
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

        // 组装面板
        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(completionButton);
        buttonContainer.appendChild(rewriteButton);
        buttonContainer.appendChild(writerButton);

        contentArea.appendChild(this.completionText);
        contentArea.appendChild(buttonContainer);

        this.completionPanel.appendChild(titleBar);
        this.completionPanel.appendChild(contentArea);

        document.body.appendChild(this.completionPanel);

        // 绑定事件
        this.setupPanelEvents();
    }

    // 设置面板事件
    setupPanelEvents() {
        // close button
        const closeBtn = document.getElementById('copilot-close-btn');
        closeBtn.addEventListener('click', () => {
            this.hideCompletionPanel();
        });

        // 接受补全按钮
        const acceptBtn = document.getElementById('copilot-accept-btn');
        acceptBtn.addEventListener('click', () => {
            this.acceptCompletion();
        });

        // 补全模式
        const completionBtn = document.getElementById('copilot-completion-btn');
        completionBtn.addEventListener('click', () => {
            this.mode = 'completion';
            // 切换到completion模式时，如果没有内容则隐藏面板
            if (!this.getTextContext().fullText.trim()) {
                this.hideCompletionPanel();
            } else {
                this.showCompletionPanel('等待补全内容...');
            }
        });

        // 全文重写按钮
        const rewriteBtn = document.getElementById('copilot-rewrite-btn');
        rewriteBtn.addEventListener('click', () => {
            this.mode = 'rewrite';
            this.rewriteFullText();
        });

        // Writer按钮
        const writerBtn = document.getElementById('copilot-writer-btn');
        writerBtn.addEventListener('click', () => {
            this.mode = 'writer';
            this.getWriter();
        });

        // 添加悬停效果
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

    // 统一设置全局事件监听器
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

    // 事件处理方法
    handleFocusIn(event) {
        if (this.isTextInput(event.target)) {
            this.currentElement = event.target;
            console.log('Focused on text input:', event.target.tagName);

            // 根据不同模式显示面板
            if (this.mode === 'completion') {
                const text = this.getTextContext().fullText.trim();
                if (text) {
                    this.showCompletionPanel('等待补全内容...');
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
        // if (event.target === this.currentElement) {
        //     this.currentElement = null;
        // }
    }

    handleKeyDown(event) {
        if (!this.currentElement) return;

        // Tab键接受补全
        if (event.key === 'Tab' && this.currentCompletion && this.completionPanel.style.display === 'block') {
            event.preventDefault();
            this.acceptCompletion();
            return;
        }

        // Escape键隐藏面板
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
        // 只有在completion模式下才自动隐藏面板
        // Writer和Rewrite模式需要用户手动关闭
        if (this.mode === 'completion' &&
            this.completionPanel &&
            !this.completionPanel.contains(event.target) &&
            event.target !== this.currentElement) {
            this.hideCompletionPanel();
        }
    }

    // Main logic to request completion
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

        // 检查缓存
        const cacheKey = this.generateCacheKey({ fullText });
        if (this.completionCache.has(cacheKey)) {
            const cachedCompletion = this.completionCache.get(cacheKey);
            this.currentCompletion = cachedCompletion;
            this.showCompletionPanel(cachedCompletion);
            console.log('使用缓存的补全结果');
            return;
        }

        // 限制缓存大小
        if (this.completionCache.size >= 50) {
            // 删除最老的缓存项
            const firstKey = this.completionCache.keys().next().value;
            this.completionCache.delete(firstKey);
        }

        this.isRequesting = true;
        this.currentCompletion = '';

        // 显示加载状态
        this.showCompletionPanel('Generating text...');
        console.log('发送补全请求，文本内容:', fullText);
        try {
            const response = await this.sendCompletionRequest(fullText);
            const completion = response.data.completion || response.completion;
            if (completion) {
                this.currentCompletion = completion;
                this.completionCache.set(cacheKey, completion);
                this.showCompletionPanel(completion);
                console.log('Completion successfully:', completion);
            } else {
                this.showCompletionPanel('No completion available');
                console.log('No valid completion received:', response);
            }
        } catch (error) {
            console.error('Error requesting completion:', error);
            this.showCompletionPanel('Completion failed, please try again');
        } finally {
            this.isRequesting = false;
        }
    }

    // 显示补全面板
    showCompletionPanel(completion) {
        if (!this.completionPanel || !this.completionText) return;

        this.completionText.textContent = completion;
        this.completionPanel.style.display = 'block';

        // 如果是加载状态，禁用按钮
        const isLoading = completion === '正在生成补全内容...';
        const buttons = this.completionPanel.querySelectorAll('button:not(#copilot-close-btn)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
            btn.style.opacity = isLoading ? '0.5' : '1';
        });
    }

    // 隐藏补全面板
    hideCompletionPanel() {
        if (this.completionPanel) {
            this.completionPanel.style.display = 'none';
        }
        this.currentCompletion = '';
    }

    // 接受补全
    acceptCompletion() {
        if (!this.currentCompletion || !this.currentElement) {
            return;
        }

        const currentText = this.currentElement.value || this.currentElement.textContent || '';
        const newText = currentText + this.currentCompletion;

        if (this.currentElement.value !== undefined) {
            this.currentElement.value = newText;
        } else {
            this.currentElement.textContent = newText;
        }

        // 只有在completion模式下才隐藏面板
        // Writer和Rewrite模式保持面板显示，方便继续操作
        if (this.mode === 'completion') {
            this.hideCompletionPanel();
        } else {
            // Writer/Rewrite模式下，清空当前补全但保持面板显示
            this.currentCompletion = '';
            this.showCompletionPanel('内容已插入，可以继续生成更多内容...');
        }

        this.currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        this.currentElement.focus();
    }
    destroy() {
        // 设置销毁标志，防止重连
        this.isDestroyed = true;

        // 清除定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // 断开port连接
        if (this.port) {
            try {
                this.port.disconnect();
            } catch (error) {
                console.log('Port already disconnected:', error);
            }
            this.port = null;
        }

        // 移除面板DOM元素
        if (this.completionPanel && this.completionPanel.parentNode) {
            this.completionPanel.parentNode.removeChild(this.completionPanel);
            this.completionPanel = null;
        }

        // 移除全局事件监听器
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

        // 清空缓存
        this.completionCache.clear();

        // 重置状态
        this.currentElement = null;
        this.currentCompletion = '';
        this.completionText = null;
        this.isRequesting = false;

        console.log('CopilotWriter destroyed');
    }

    // 打开Writer功能
    async getWriter() {
        if (this.isRequesting) {
            console.log('Writer request skipped: already requesting');
            return;
        }

        this.mode = 'writer';
        this.currentCompletion = '';
        this.isRequesting = true;
        this.showCompletionPanel('正在生成内容...');

        console.log('Sending WRITER_STREAM message, port:', this.port);

        if (!this.port) {
            this.initializePort();
            // 等待一点时间让port初始化
            setTimeout(() => {
                if (this.port) {
                    this.sendWriterRequest();
                } else {
                    this.handleWriterError('Failed to establish connection');
                }
            }, 100);
            return;
        }

        this.sendWriterRequest();
    }

    sendWriterRequest() {
        try {
            // 发送消息给 background.js，启动 Writer 流式处理
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

    // 全文重写功能
    async rewriteFullText() {
        if (this.isRequesting) {
            console.log('Rewrite request skipped: already requesting');
            return;
        }

        this.mode = 'rewrite';
        this.currentCompletion = '';
        this.isRequesting = true;
        this.showCompletionPanel('正在重写内容...');

        if (!this.port) {
            this.initializePort();
            // 等待一点时间让port初始化
            setTimeout(() => {
                if (this.port) {
                    this.sendRewriteRequest();
                } else {
                    this.handleRewriteError('Failed to establish connection');
                }
            }, 100);
            return;
        }

        this.sendRewriteRequest();
    }

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
        this.showCompletionPanel(`重写错误: ${errorMessage}`);
    }

    async sendCompletionRequest(prompt) {
        const response = await chrome.runtime.sendMessage({
            type: "COMPLETION_REQUEST",
            data: { prompt }
        });
        return response;
    }

    async enableCompletion() {
        const response = await chrome.runtime.sendMessage({
            type: "ENABLE_COMPLETION",
            data: {}
        });
        return response;
    }

    initializePort() {
        if (this.port) {
            return this.port; // 如果已经存在port，直接返回
        }

        try {
            this.port = chrome.runtime.connect({ name: "AI_WRITER_STREAM" });

            this.port.onMessage.addListener((msg) => {
                console.log('Port received message:', msg);
                this.handlePortMessage(msg);
            });

            this.port.onDisconnect.addListener(() => {
                console.log('Port disconnected');
                this.port = null;
                // 如果不是主动断开，尝试重连
                if (!this.isDestroyed) {
                    setTimeout(() => {
                        console.log('Attempting to reconnect port...');
                        this.initializePort();
                    }, 1000);
                }
            });

            console.log('Port initialized successfully');
        } catch (error) {
            console.error('Failed to initialize port:', error);
            this.port = null;
        }

        return this.port;
    }

    // 其他工具方法保持不变
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
        console.log('获取的完整文本:', text);
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

    async saveAllPageTextToStorage() {
        // 获取所有可见文本节点
        function getAllVisibleText(node) {
            let text = '';
            if (node.nodeType === Node.TEXT_NODE) {
                // 过滤掉空白
                if (node.textContent.trim()) {
                    text += node.textContent.trim() + ' ';
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 忽略script、style、noscript等
                const tag = node.tagName && node.tagName.toLowerCase();
                if (['script', 'style', 'noscript', 'svg', 'canvas', 'iframe'].includes(tag)) return '';
                // 只遍历可见元素
                const style = window.getComputedStyle(node);
                if (style && (style.display === 'none' || style.visibility === 'hidden')) return '';
                for (let child of node.childNodes) {
                    text += getAllVisibleText(child);
                }
            }
            return text;
        }

        const allText = getAllVisibleText(document.body).replace(/\s+/g, ' ').trim();

        // 存储到chrome.storage.local
        chrome.storage.local.set({ pageTextSnapshot: allText }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save page text:', chrome.runtime.lastError);
            } else {
                console.log('Page text saved to chrome.storage.local as "pageTextSnapshot"');
            }
        });
    }
}
