// 简化的请求函数保持不变
async function sendCompletionRequest(prompt) {
    const response = await chrome.runtime.sendMessage({
        type: "COMPLETION_REQUEST",
        data: { prompt }
    });
    return response;
}

let copilotWriter = null;
let port = null;

// 初始化 port 连接
function initializePort() {
    if (!port) {
        port = chrome.runtime.connect({ name: "AI_WRITER_STREAM" });
        
        port.onMessage.addListener((msg) => {
            console.log('Port received message:', msg);
            if (copilotWriter) {
                copilotWriter.handlePortMessage(msg);
            }
        });

        port.onDisconnect.addListener(() => {
            console.log('Port disconnected');
            port = null;
        });
    }
    return port;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'INIT_COPILOT_WRITER') {
        if (!copilotWriter) {
            copilotWriter = new CopilotWriter();
            sendResponse({ success: true, message: 'CopilotWriter initialized' });
        } else {
            sendResponse({ success: false, message: 'Already initialized' });
        }
    }
    if (message.type === 'DESTROY_COPILOT_WRITER') {
        if (copilotWriter) {
            copilotWriter.destroy();
            copilotWriter = null;
            console.log('CopilotWriter destroyed');
            sendResponse({ success: true, message: 'CopilotWriter destroyed' });
        } else {
            sendResponse({ success: false, message: 'Not initialized' });
        }
    }
});

class CopilotWriter {
    constructor() {
        this.currentElement = null;
        this.completionPanel = null; // 改为固定面板
        this.currentCompletion = "";
        this.debounceTimer = null;
        this.completionCache = new Map();
        this.isRequesting = false;
        this.mode = 'completion'; // 'completion' 或 'rewrite'
        this.port = null; // 添加 port 属性

        this.init();
    }

    async init() {
        this.port = initializePort(); // 初始化 port 连接
        this.createCompletionPanel(); // 创建固定面板
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
        }
        if (msg.type === 'STREAM_ERROR') {
            console.error(`${this.mode} stream error:`, msg.error);
            this.showCompletionPanel('处理失败，请重试');
        }
    }

    // 创建固定的补全面板   
    createCompletionPanel() {
        // 创建主容器
        this.completionPanel = document.createElement('div');
        this.completionPanel.id = 'copilot-completion-panel';
        this.completionPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 300px;
            background: #2d3748;
            border: 1px solid #4a5568;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            display: none;
            overflow: hidden;
        `;

        // 创建标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background: #1a202c;
            color: #e2e8f0;
            padding: 8px 12px;
            font-weight: bold;
            border-bottom: 1px solid #4a5568;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        titleBar.innerHTML = `
            <span>🤖 AI 补全</span>
            <button id="copilot-close-btn" style="
                background: none;
                border: none;
                color: #e2e8f0;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
            ">×</button>
        `;

        // 创建内容区域
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            padding: 12px;
            max-height: 200px;
            overflow-y: auto;
        `;

        // 创建补全文本显示区域
        this.completionText = document.createElement('div');
        this.completionText.id = 'copilot-completion-text';
        this.completionText.style.cssText = `
            color: #e2e8f0;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin-bottom: 12px;
            min-height: 60px;
            background: #1a202c;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #4a5568;
        `;
        this.completionText.textContent = '等待补全内容...';

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 8px;
        `;

        // 创建接受补全按钮
        const acceptButton = document.createElement('button');
        acceptButton.id = 'copilot-accept-btn';
        acceptButton.textContent = '✓ 接受补全';
        acceptButton.style.cssText = `
            flex: 1;
            background: #48bb78;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;

        // 创建补全模式按钮
        const completionButton = document.createElement('button');
        completionButton.id = 'copilot-completion-btn';
        completionButton.textContent = '🔄 补全模式';
        completionButton.style.cssText = `
            flex: 1;
            background: #48bb78;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;

        // 创建全文重写按钮
        const rewriteButton = document.createElement('button');
        rewriteButton.id = 'copilot-rewrite-btn';
        rewriteButton.textContent = '📝 全文重写';
        rewriteButton.style.cssText = `
            flex: 1;
            background: #ed8936;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;

        // 创建Writer按钮
        const writerButton = document.createElement('button');
        writerButton.id = 'copilot-writer-btn';
        writerButton.textContent = '✍️ Writer';
        writerButton.style.cssText = `
            flex: 1;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;

        // 组装面板
        buttonContainer.appendChild(acceptButton);
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
        // 关闭按钮
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
        const completionBtn = document.getElementById('copilot-accept-btn');
        completionBtn.addEventListener('click', () => {
            this.mode = 'completion';
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

        }
    }

    handleFocusOut(event) {

        if (event.target === this.currentElement) {
            // 不再自动隐藏面板，让用户手动控制
            // this.hideCompletionPanel();
            // this.currentElement = null;
        }

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
            this.debounceTimer = setTimeout(() => {
                this.requestCompletion();
            }, 300);
        }
    }
    handleClick(event) {
        // 点击面板外部隐藏面板
        if (this.completionPanel.style.display === 'block' &&
            !this.completionPanel.contains(event.target) &&
            event.target !== this.currentElement) {
            this.hideCompletionPanel();
        }
    }

    // 核心功能方法
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

        this.isRequesting = true;
        this.currentCompletion = '';

        // 显示加载状态
        this.showCompletionPanel('正在生成补全内容...');
        console.log('发送补全请求，文本内容:', fullText);
        try {
            const response = await sendCompletionRequest(fullText);
            const completion = response.data.completion || response.completion;
            if (completion) {
                this.currentCompletion = completion;
                this.completionCache.set(cacheKey, completion);
                this.showCompletionPanel(completion);
                console.log('补全成功:', completion);
            } else {
                this.showCompletionPanel('暂无补全建议');
                console.log('未收到有效的补全内容:', response);
            }
        } catch (error) {
            console.error('Error requesting completion:', error);
            this.showCompletionPanel('补全失败，请重试');
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

        this.hideCompletionPanel();
        this.currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        this.currentElement.focus();

    }

    destroy() {
        // 移除全局事件监听
        document.removeEventListener('focusin', this.handleFocusInBound);
        document.removeEventListener('focusout', this.handleFocusOutBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('input', this.handleInputBound);
        document.removeEventListener('click', this.handleClickBound);

        // 移除面板
        if (this.completionPanel) {
            this.completionPanel.remove();
        }
        this.currentElement = null;
        this.completionPanel = null;
        this.currentCompletion = "";
        this.debounceTimer = null;
        this.completionCache.clear();
        this.isRequesting = false;
        console.log('CopilotWriter destroyed');
    }

    // 打开Writer功能
    async getWriter() {
        this.mode = 'writer';
        this.currentCompletion = '';
        this.showCompletionPanel('正在生成内容...');
        
        console.log('Sending WRITER_STREAM message, port:', this.port);
        
        if (!this.port) {
            console.error('Port is not initialized');
            this.showCompletionPanel('连接错误，请重试');
            return;
        }
        
        // 发送消息给 background.js，启动 Writer 流式处理
        this.port.postMessage({
            type: 'WRITER_STREAM',
            data: { prompt: this.getTextContext().fullText }
        });
    }

    // 全文重写功能
    async rewriteFullText() {
        this.mode = 'rewrite';
        this.currentCompletion = '';
        this.showCompletionPanel('正在重写内容...');
        
        console.log('Sending REWRITER_STREAM message, port:', this.port);
        
        if (!this.port) {
            console.error('Port is not initialized');
            this.showCompletionPanel('连接错误，请重试');
            return;
        }
        
        this.port.postMessage({
            type: 'REWRITER_STREAM',
            data: { prompt: this.getTextContext().fullText }
        });
    }


    // 其他工具方法保持不变
    generateCacheKey(context) {
        return context.fullText.slice(0, 100); // 使用前 100 个字符作为缓存键
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
}
