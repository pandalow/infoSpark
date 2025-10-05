// Copilot Web Content Script - AI Text Completion
class CopilotWeb {
    
  constructor() {
    this.currentElement = null;
    this.ghostElement = null;
    this.currentCompletion = '';
    this.isEnabled = true;
    this.debounceTimer = null;
    this.completionCache = new Map();
    
    this.init();
  }

  async init() {
    try {
      console.log('Initializing Copilot Web content script');
      
      // Create ghost text overlay
      this.createGhostOverlay();
      
      // Setup existing elements
      this.setupElementListeners(document);
      
      // Listen for input events on the entire document
      document.addEventListener('focusin', this.handleFocusIn.bind(this));
      document.addEventListener('focusout', this.handleFocusOut.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      document.addEventListener('input', this.handleInput.bind(this));
      document.addEventListener('click', this.handleClick.bind(this));
      document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
      
      // Handle dynamically added elements
      this.observeMutations();
      
      // Get initial settings
      this.loadSettings();
    } catch (error) {
      console.error('Error initializing Copilot Web:', error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_STATUS'
      });
      this.isEnabled = response.isReady;
      console.log('AI Status:', response.isReady ? 'Ready' : 'Not available');
    } catch (error) {
      console.error('Failed to load settings:', error);
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

  async requestCompletion() {
    if (!this.currentElement || !this.isEnabled) {
      return;
    }

    try {
      const context = this.getTextContext();
      if (!context.before.trim() && !context.after.trim()) {
        this.hideGhostText();
        return;
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(context);
      if (this.completionCache.has(cacheKey)) {
        const cachedCompletion = this.completionCache.get(cacheKey);
        console.log('Using cached completion:', cachedCompletion);
        this.showGhostText(cachedCompletion);
        return;
      }

      console.log('Requesting AI completion for context:', context);

      const response = await chrome.runtime.sendMessage({
        type: 'AI_COMPLETION',
        data: {
          context: context,
          currentText: this.currentElement.value || this.currentElement.textContent || '',
          cursorPosition: this.getCursorPosition()
        }
      });

      if (response && response.success && response.completion) {
        const completion = response.completion;
        console.log('Received completion:', completion);
        this.completionCache.set(cacheKey, completion);
        this.showGhostText(completion);
      } else {
        console.warn('No completion received:', response?.error || 'Unknown error');
        this.hideGhostText();
      }
    } catch (error) {
      console.error('Error requesting completion:', error);
      this.hideGhostText();
    }
  }

  getTextContext() {
    try {
      const element = this.currentElement;
      if (!element) {
        return { before: '', after: '', fullText: '', cursorPosition: 0 };
      }
      
      const cursorPos = this.getCursorPosition();
      const text = element.value || element.textContent || '';
      
      const beforeCursor = text.substring(0, cursorPos);
      const afterCursor = text.substring(cursorPos);
      
      // Get surrounding context (50 chars before and after)
      const contextBefore = beforeCursor.slice(-50);
      const contextAfter = afterCursor.slice(0, 50);
      
      return {
        before: contextBefore,
        after: contextAfter,
        fullText: text,
        cursorPosition: cursorPos
      };
    } catch (error) {
      console.error('Error getting text context:', error);
      return { before: '', after: '', fullText: '', cursorPosition: 0 };
    }
  }

  getCursorPosition() {
    try {
      const element = this.currentElement;
      if (!element) return 0;
      
      if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
        return element.selectionStart || 0;
      }
      
      if (element.contentEditable === 'true') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return range.startOffset;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting cursor position:', error);
      return 0;
    }
  }

  generateCacheKey(context) {
    return `${context.before}_${context.after}`.slice(0, 100);
  }

  showGhostText(completion) {
    if (!completion || !this.currentElement) {
      console.log('Cannot show ghost text: missing completion or element');
      return;
    }

    try {
      this.currentCompletion = completion;
      
      // Position ghost text at cursor
      const position = this.getElementPosition();
      const cursorOffset = this.getCursorOffset();
      
      // Match font styles exactly
      const computedStyle = window.getComputedStyle(this.currentElement);
      
      this.ghostElement.textContent = completion;
      this.ghostElement.style.display = 'block';
      this.ghostElement.style.left = (position.left + cursorOffset.left) + 'px';
      this.ghostElement.style.top = (position.top + cursorOffset.top) + 'px';
      this.ghostElement.style.fontFamily = computedStyle.fontFamily;
      this.ghostElement.style.fontSize = computedStyle.fontSize;
      this.ghostElement.style.fontWeight = computedStyle.fontWeight;
      this.ghostElement.style.lineHeight = computedStyle.lineHeight;
      this.ghostElement.style.letterSpacing = computedStyle.letterSpacing;
      this.ghostElement.style.wordSpacing = computedStyle.wordSpacing;
      this.ghostElement.style.textTransform = computedStyle.textTransform;
      
      console.log('Ghost text displayed at position:', {
        left: position.left + cursorOffset.left,
        top: position.top + cursorOffset.top,
        completion
      });
    } catch (error) {
      console.error('Error showing ghost text:', error);
      this.hideGhostText();
    }
  }

  hideGhostText() {
    this.currentCompletion = '';
    this.ghostElement.style.display = 'none';
  }

  acceptCompletion() {
    if (!this.currentCompletion || !this.currentElement) return;

    const element = this.currentElement;
    const cursorPos = this.getCursorPosition();
    
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
      const currentValue = element.value;
      const newValue = currentValue.substring(0, cursorPos) + this.currentCompletion + currentValue.substring(cursorPos);
      element.value = newValue;
      element.selectionStart = element.selectionEnd = cursorPos + this.currentCompletion.length;
      
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(this.currentCompletion));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    this.hideGhostText();
  }

  getElementPosition() {
    const rect = this.currentElement.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    };
  }

  getCursorOffset() {
    try {
      const element = this.currentElement;
      const computedStyle = window.getComputedStyle(element);
      const cursorPos = this.getCursorPosition();
      
      // Get basic styling info
      const fontSize = parseInt(computedStyle.fontSize) || 14;
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2;
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 4;
      const paddingTop = parseInt(computedStyle.paddingTop) || 4;
      const borderLeft = parseInt(computedStyle.borderLeftWidth) || 0;
      const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
      
      // For input and textarea elements, we can calculate more precisely
      if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
        return this.getInputCursorPosition(element, cursorPos, {
          fontSize,
          lineHeight,
          paddingLeft: paddingLeft + borderLeft,
          paddingTop: paddingTop + borderTop
        });
      }
      
      // For contenteditable elements
      if (element.contentEditable === 'true') {
        return this.getContentEditableCursorPosition(element, {
          paddingLeft: paddingLeft + borderLeft,
          paddingTop: paddingTop + borderTop
        });
      }
      
      // Fallback for other elements
      return {
        left: paddingLeft + borderLeft,
        top: paddingTop + borderTop
      };
    } catch (error) {
      console.error('Error calculating cursor offset:', error);
      return { left: 4, top: 20 }; // Fallback values
    }
  }
  
  getInputCursorPosition(element, cursorPos, styles) {
    try {
      // Create a temporary span to measure text width
      const span = document.createElement('span');
      span.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font-family: ${window.getComputedStyle(element).fontFamily};
        font-size: ${styles.fontSize}px;
        font-weight: ${window.getComputedStyle(element).fontWeight};
        letter-spacing: ${window.getComputedStyle(element).letterSpacing};
      `;
      
      const text = element.value || '';
      const textBeforeCursor = text.substring(0, cursorPos);
      
      // Handle multiline text (textarea)
      if (element.tagName.toLowerCase() === 'textarea') {
        const lines = textBeforeCursor.split('\n');
        const currentLineText = lines[lines.length - 1];
        const lineNumber = lines.length - 1;
        
        // Measure current line width
        span.textContent = currentLineText;
        document.body.appendChild(span);
        const textWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        
        return {
          left: styles.paddingLeft + textWidth,
          top: styles.paddingTop + (lineNumber * styles.lineHeight)
        };
      } 
      // Handle single line text (input)
      else {
        span.textContent = textBeforeCursor;
        document.body.appendChild(span);
        const textWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);
        
        return {
          left: styles.paddingLeft + textWidth,
          top: styles.paddingTop
        };
      }
    } catch (error) {
      console.error('Error calculating input cursor position:', error);
      return { left: 4, top: 4 };
    }
  }
  
  getContentEditableCursorPosition(element, styles) {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) {
        return {
          left: styles.paddingLeft,
          top: styles.paddingTop
        };
      }
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      return {
        left: rect.left - elementRect.left + styles.paddingLeft,
        top: rect.top - elementRect.top + styles.paddingTop
      };
    } catch (error) {
      console.error('Error calculating contenteditable cursor position:', error);
      return { left: 4, top: 4 };
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CopilotWeb();
  });
} else {
  new CopilotWeb();
}