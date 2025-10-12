const port = chrome.runtime.connect({ name: "writer" });

//监听background
port.onMessage.addListener(function (msg) {
    if (msg.type === "STREAM_DATA") {
        console.log("Received chunk", msg.data);
    } else if (msg.type === "STREAM_END") {
        console.log("STREAM_END"){
            console.log("Stream.ended")
        }
    }
});

//发送消息到background
function requestCompletion(promtp, options) {
    port.postMessage({
        type: "START_STREAM",
        data: { prompt, options }
    })
}

class CopilotWriter {
    constructor() {
        this.currentElement = null;
        this.ghostElement = null;
        this.currentCompletion = "";
        this.debounceTimer = null;
        this.completionCache = new Map();
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
      font-weight: inherit;
      line-height: inherit;
      letter-spacing: inherit;
      word-spacing: inherit;
      text-transform: inherit;
      white-space: pre;
      display: none;
      background: transparent;
      border: none;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      text-decoration: none;
      text-shadow: none;
      vertical-align: baseline;
      transform: translateZ(0);
    `;
        document.body.appendChild(this.ghostElement);
    }

    observeMutations() {
        const observer = new MutationObserver((mutations) => {
            try {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node && node.nodeType === Node.ELEMENT_NODE) {
                            this.setupElementListeners(node);
                        }
                    });
                });
            } catch (error) {
                console.error('Error in mutation observer:', error);
            }
        });

        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            console.error('Error setting up mutation observer:', error);
        }
    }
    setupElementListeners(element) {
        // Target text inputs, textareas, and contenteditable elements
        let targets = [];

        try {
            if (element && element.querySelectorAll) {
                targets = Array.from(element.querySelectorAll('textarea, input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="password"], [contenteditable="true"]'));
            }

            if (this.isTextInput(element)) {
                targets.push(element);
            }

            targets.forEach(target => {
                if (target && !target.dataset.copilotSetup) {
                    target.dataset.copilotSetup = 'true';
                }
            });
        } catch (error) {
            console.error('Error setting up element listeners:', error);
        }
    }

    isTextInput(element) {
        if (!element || !element.tagName) {
            return false;
        }

        const tag = element.tagName.toLowerCase();
        const type = (element.type || '').toLowerCase();

        return (
            tag === 'textarea' ||
            (tag === 'input' && ['text', 'email', 'search', 'url', 'password'].includes(type)) ||
            element.contentEditable === 'true'
        );
    }

    handleFocusIn(event) {
        try {
            if (event && event.target && this.isTextInput(event.target)) {
                this.currentElement = event.target;
                console.log('Focused on text input:', event.target.tagName, event.target.type || 'no-type');
            }
        } catch (error) {
            console.error('Error in handleFocusIn:', error);
        }
    }

    handleFocusOut(event) {
        try {
            if (event && event.target === this.currentElement) {
                this.hideGhostText();
                this.currentElement = null;
            }
        } catch (error) {
            console.error('Error in handleFocusOut:', error);
        }
    }

    handleKeyDown(event) {
        if (!this.currentElement || !this.isEnabled || !event) return;

        try {
            // Handle Tab key for completion acceptance
            if (event.key === 'Tab' && this.currentCompletion) {
                event.preventDefault();
                this.acceptCompletion();
                return;
            }

            // Handle Escape key to dismiss completion
            if (event.key === 'Escape' && this.currentCompletion) {
                event.preventDefault();
                this.hideGhostText();
                return;
            }

            // Hide ghost text on arrow keys or other navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                this.hideGhostText();
            }

            // Update ghost text position on cursor movement
            if (['ArrowLeft', 'ArrowRight'].includes(event.key) && this.currentCompletion) {
                // Delay to let cursor position update
                setTimeout(() => {
                    if (this.currentCompletion) {
                        this.updateGhostTextPosition();
                    }
                }, 10);
            }
        } catch (error) {
            console.error('Error in handleKeyDown:', error);
        }
    }

    updateGhostTextPosition() {
        if (!this.currentCompletion || !this.currentElement) return;

        try {
            const position = this.getElementPosition();
            const cursorOffset = this.getCursorOffset();

            this.ghostElement.style.left = (position.left + cursorOffset.left) + 'px';
            this.ghostElement.style.top = (position.top + cursorOffset.top) + 'px';

            console.log('Updated ghost text position:', {
                left: position.left + cursorOffset.left,
                top: position.top + cursorOffset.top
            });
        } catch (error) {
            console.error('Error updating ghost text position:', error);
        }
    }

    handleInput(event) {
        if (!this.currentElement || !this.isEnabled || !event || event.target !== this.currentElement) {
            return;
        }

        try {
            // Clear previous timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            // Hide ghost text when input changes
            this.hideGhostText();

            // Debounce input to avoid too many API calls
            this.debounceTimer = setTimeout(() => {
                this.requestCompletion();
            }, 300); // 300ms debounce
        } catch (error) {
            console.error('Error in handleInput:', error);
        }
    }

    handleClick(event) {
        if (!this.currentElement || !event || event.target !== this.currentElement) {
            return;
        }

        try {
            // Hide ghost text when user clicks to change cursor position
            if (this.currentCompletion) {
                this.hideGhostText();
            }
        } catch (error) {
            console.error('Error in handleClick:', error);
        }
    }

    handleSelectionChange() {
        try {
            // If there's an active ghost text and the selection has changed, hide it
            if (this.currentCompletion && this.currentElement) {
                // Check if the selection is in our current element
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


}