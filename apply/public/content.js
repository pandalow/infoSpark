const port = chrome.runtime.connect({ name: "AI_WRITER_STREAM" });

// 监听background消息
port.onMessage.addListener(function (msg) {
    if (msg.type === "STREAM_DATA") {
        if (copilotWriter) {
            copilotWriter.handleStreamData(msg.data);
        }
    } else if (msg.type === "STREAM_END") {
        console.log("STREAM_END");
        if (copilotWriter) {
            copilotWriter.handleStreamEnd();
        }
    } else if (msg.type === "STREAM_ERROR") {
        console.error("Stream error:", msg.error);
        if (copilotWriter) {
            copilotWriter.handleStreamError(msg.error);
        }
    }
});

// 发送消息到background
function requestCompletion(prompt, options) {
    port.postMessage({
        type: "START_STREAM",
        data: { prompt, options }
    });
}

class CopilotWriter {
    constructor() {
        this.currentElement = null;
        this.ghostElement = null;
        this.currentCompletion = "";
        this.debounceTimer = null;
        this.completionCache = new Map();
        this.isEnabled = true;
        this.isStreaming = false;

        this.init();
    }

    async init() {
        try {
            this.createGhostOverlay();
            this.setupGlobalEventListeners(); // 统一的事件监听器设置
            this.observeMutations();
            console.log('CopilotWriter initialized');
        } catch (error) {
            console.error('Error during CopilotWriter initialization:', error);
        }
    }

    // 统一设置全局事件监听器
    setupGlobalEventListeners() {
        // 使用事件委托，避免为每个元素单独绑定
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    }

    // 流式数据处理方法
    handleStreamData(chunk) {
        try {
            this.currentCompletion += chunk;
            this.showGhostText(this.currentCompletion);
        } catch (error) {
            console.error('Error handling stream data:', error);
        }
    }

    handleStreamEnd() {
        try {
            this.isStreaming = false;
            console.log('Stream completed, final completion:', this.currentCompletion);
        } catch (error) {
            console.error('Error handling stream end:', error);
        }
    }

    handleStreamError(error) {
        try {
            this.isStreaming = false;
            this.hideGhostText();
            console.error('Stream error:', error);
        } catch (error) {
            console.error('Error handling stream error:', error);
        }
    }

    // 事件处理方法
    handleFocusIn(event) {
        try {
            if (this.isTextInput(event.target)) {
                this.currentElement = event.target;
                console.log('Focused on text input:', event.target.tagName);
            }
        } catch (error) {
            console.error('Error in handleFocusIn:', error);
        }
    }

    handleFocusOut(event) {
        try {
            if (event.target === this.currentElement) {
                this.hideGhostText();
                this.currentElement = null;
            }
        } catch (error) {
            console.error('Error in handleFocusOut:', error);
        }
    }

    handleKeyDown(event) {
        if (!this.currentElement || !this.isEnabled) return;

        try {
            if (event.key === 'Tab' && this.currentCompletion) {
                event.preventDefault();
                this.acceptCompletion();
                return;
            }

            if (event.key === 'Escape' && this.currentCompletion) {
                event.preventDefault();
                this.hideGhostText();
                return;
            }

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                this.hideGhostText();
            }
        } catch (error) {
            console.error('Error in handleKeyDown:', error);
        }
    }

    handleInput(event) {
        if (!this.currentElement || !this.isEnabled || event.target !== this.currentElement) {
            return;
        }

        try {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.hideGhostText();

            this.debounceTimer = setTimeout(() => {
                this.requestCompletion();
            }, 300);
        } catch (error) {
            console.error('Error in handleInput:', error);
        }
    }

    handleClick(event) {
        if (event.target === this.currentElement && this.currentCompletion) {
            this.hideGhostText();
        }
    }

    handleSelectionChange() {
        try {
            if (this.currentCompletion && this.currentElement) {
                const selection = window.getSelection();
                if (selection.anchorNode && 
                    (selection.anchorNode === this.currentElement || 
                     this.currentElement.contains(selection.anchorNode))) {
                    this.hideGhostText();
                }
            }
        } catch (error) {
            console.error('Error in handleSelectionChange:', error);
        }
    }

    // 核心功能方法
    async requestCompletion() {
        if (!this.currentElement || !this.isEnabled || this.isStreaming) {
            return;
        }

        try {
            const context = this.getTextContext();
            if (!context.before.trim()) {
                this.hideGhostText();
                return;
            }

            this.currentCompletion = '';
            this.isStreaming = true;

            const options = {
                tone: 'friendly',
                length: 'medium',
                format: 'plain_text',
                sharedContext: context.before
            };

            requestCompletion(context.before, options);

        } catch (error) {
            console.error('Error requesting completion:', error);
            this.hideGhostText();
            this.isStreaming = false;
        }
    }

    // 工具方法
    getTextContext() {
        if (!this.currentElement) {
            return { before: '', after: '' };
        }

        try {
            const cursorPos = this.getCursorPosition();
            const text = this.currentElement.value || this.currentElement.textContent || '';

            return {
                before: text.substring(0, cursorPos),
                after: text.substring(cursorPos)
            };
        } catch (error) {
            console.error('Error getting text context:', error);
            return { before: '', after: '' };
        }
    }

    getCursorPosition() {
        if (!this.currentElement) return 0;

        try {
            if (this.currentElement.selectionStart !== undefined) {
                return this.currentElement.selectionStart;
            }

            if (this.currentElement.contentEditable === 'true') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    return selection.getRangeAt(0).startOffset;
                }
            }
        } catch (error) {
            console.error('Error getting cursor position:', error);
        }

        return 0;
    }

    // UI 方法
    showGhostText(completion) {
        if (!completion || !this.currentElement || !this.ghostElement) {
            return;
        }

        try {
            const position = this.getElementPosition();
            const cursorOffset = this.getCursorOffset();

            this.ghostElement.textContent = completion;
            this.ghostElement.style.left = (position.left + cursorOffset.left) + 'px';
            this.ghostElement.style.top = (position.top + cursorOffset.top) + 'px';
            this.ghostElement.style.display = 'block';
        } catch (error) {
            console.error('Error showing ghost text:', error);
        }
    }

    hideGhostText() {
        try {
            if (this.ghostElement) {
                this.ghostElement.style.display = 'none';
                this.ghostElement.textContent = '';
            }
            this.currentCompletion = '';
        } catch (error) {
            console.error('Error hiding ghost text:', error);
        }
    }

    acceptCompletion() {
        if (!this.currentCompletion || !this.currentElement) {
            return;
        }

        try {
            const cursorPos = this.getCursorPosition();
            const currentText = this.currentElement.value || this.currentElement.textContent || '';
            const newText = currentText.substring(0, cursorPos) + this.currentCompletion + currentText.substring(cursorPos);

            if (this.currentElement.value !== undefined) {
                this.currentElement.value = newText;
                this.currentElement.selectionStart = this.currentElement.selectionEnd = cursorPos + this.currentCompletion.length;
            } else {
                this.currentElement.textContent = newText;
            }

            this.hideGhostText();
            this.currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (error) {
            console.error('Error accepting completion:', error);
        }
    }

    // 辅助方法保持不变
    getElementPosition() {
        if (!this.currentElement) return { left: 0, top: 0 };

        try {
            const rect = this.currentElement.getBoundingClientRect();
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };
        } catch (error) {
            return { left: 0, top: 0 };
        }
    }

    getCursorOffset() {
        if (!this.currentElement) return { left: 0, top: 0 };

        try {
            const cursorPos = this.getCursorPosition();
            const text = this.currentElement.value || this.currentElement.textContent || '';
            const textBeforeCursor = text.substring(0, cursorPos);

            const styles = window.getComputedStyle(this.currentElement);
            const fontSize = parseInt(styles.fontSize) || 14;
            const lineHeight = parseInt(styles.lineHeight) || fontSize * 1.2;

            const lines = textBeforeCursor.split('\n');
            const currentLine = lines[lines.length - 1];

            return {
                left: currentLine.length * (fontSize * 0.6),
                top: (lines.length - 1) * lineHeight
            };
        } catch (error) {
            return { left: 0, top: 0 };
        }
    }

    createGhostOverlay() {
        this.ghostElement = document.createElement('div');
        this.ghostElement.id = 'copilot-ghost-text';
        this.ghostElement.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 999999;
            color: #9ca3af;
            opacity: 0.6;
            font-family: inherit;
            font-size: inherit;
            white-space: pre;
            display: none;
        `;
        document.body.appendChild(this.ghostElement);
    }

    observeMutations() {
        const observer = new MutationObserver((mutations) => {
            // DOM变化监听，但现在使用事件委托，这里可以简化或移除
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
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

// 初始化
let copilotWriter;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        copilotWriter = new CopilotWriter();
    });
} else {
    copilotWriter = new CopilotWriter();
}