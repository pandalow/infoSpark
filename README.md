# InfoSpark AI - Your Local AI Assistant

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Local AI](https://img.shields.io/badge/Powered%20by-Chrome%20Built--in%20AI-FF6B6B?style=flat-square)](https://developer.chrome.com/docs/ai/)

## 🌟 Project Overview

InfoSpark AI is a Chrome extension that provides advanced text processing capabilities powered by Chrome's built-in AI. It enables features such as context-aware smart conversations, intelligent text completion, and text rewriting optimization. With customizable settings for tone, format, and length, InfoSpark AI adapts to your specific needs. All processing is done locally on your device, ensuring privacy and security without requiring API keys or an internet connection.

## ✨ Core Features

### 💬 Smart Conversation
- **Context-Aware Chat**: AI understands current webpage content and provides relevant suggestions
- **Conversation Memory**: Maintains conversation continuity with multi-turn deep interactions
- **Personalized Settings**: Customize AI personality and behavior styles
- **Real-time Response**: Based on local AI models for fast, lag-free responses

### ✍️ Intelligent Writing
- **Universal Text Completion**: Get AI text completion in any webpage input field
- **Multiple Writing Styles**:
  - 🎨 **Tone Control**: Casual, formal, neutral
  - 📏 **Length Control**: Short, medium, long formats
  - 📄 **Format Support**: Plain text, Markdown format
- **Context Sharing**: Provide additional background information for specific scenarios
- **Real-time Suggestions**: Auto-display AI suggestions while typing, press Tab to accept

### 🔧 Text Optimization
- **Smart Rewriting**: One-click improvement of existing text expression
- **Style Adjustment**:
  - 🗣️ **Tone Conversion**: More casual, as-is, more formal
  - 📝 **Format Conversion**: Support multiple text format conversions
  - 📊 **Length Adjustment**: Shorter, maintain, longer text length
- **Batch Processing**: Support segmented optimization of long texts

### ⚙️ Smart Configuration
- **Dual Settings System**:
  - 📝 Writer Settings: Control text generation behavior
  - 🔄 Rewriter Settings: Control text rewriting style
- **Template Switching**: Independent configuration tabs for Writer and Rewriter
- **Real-time Saving**: Configuration changes auto-save and take effect immediately
- **Reset Function**: One-click restore to default settings

## 🎨 User Interface

### Modern Design
- **Glass Morphism**: Modern UI design with frosted glass effects
- **Gradient Animations**: Smooth color gradients and transition animations
- **Compact Layout**: Compact interface optimized for Chrome sidebar
- **Status Indicators**: Clear AI status and operation feedback

### Interactive Experience
- **Three Main Modules**:
  - 💬 Chat - Smart conversation
  - ⚙️ Context - Configuration management
  - 📚 Guide - Usage instructions
- **Expandable Guide**: One-click view of feature descriptions without permanent space occupation
- **Instant Feedback**: Clear prompts for save success, status changes, and other operations

## 🚀 Getting Started

### System Requirements
- Chrome Browser 138+ version
- Device supporting Chrome built-in AI functionality

### Installation Steps
1. Download the extension source code
2. Open Chrome extensions management page (`chrome://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the project's `apply/dist` folder

### Quick Start
1. **Activate Copilot**: Click the extension icon and enable Copilot function in the sidebar
2. **Configure Context**: Set AI role and behavior in the Context tab
3. **Start Conversation**: Chat with AI in the Chat tab
4. **Web Writing**: Experience AI completion in any webpage text box

## 📋 Feature Details

### Chat Function
```
Features:
- Context-based conversation using current page content
- Support for 8-round conversation history memory
- Custom AI role settings
- Real-time typing response
```

### Writer Function
```
Configuration Options:
- tone: casual | formal | neutral
- length: short | medium | long  
- format: plain-text | markdown
- sharedContext: Custom background information
```

### Rewriter Function
```
Configuration Options:
- tone: more-casual | as-is | more-formal
- format: plain-text | markdown | as-is
- length: shorter | as-is | longer
- sharedContext: Custom rewriting guidance
```

## 🔒 Privacy & Security

- **Fully Local**: All AI processing is performed on your device
- **No Data Upload**: Never sends your data to any external servers
- **Offline Operation**: AI functionality works without internet connection
- **Data Encryption**: Locally stored configuration data is encrypted

## 🛠️ Technical Architecture

### Frontend Technology
- **React 18**: Modern user interface framework
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server

### Chrome Extension
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background script processing
- **Content Scripts**: Webpage content interaction
- **Chrome AI API**: Built-in AI model invocation

### AI Model Integration
- **LanguageModel API**: Conversation and text generation
- **Writer API**: Intelligent writing assistance
- **Rewriter API**: Text rewriting optimization

## 📖 Use Cases

### Daily Writing
- **Email Composition**: Get writing suggestions in Gmail and other email platforms
- **Social Media**: Optimize post content on Twitter, LinkedIn, and other platforms
- **Document Editing**: Improve writing efficiency in Google Docs, Notion, and other platforms

### Professional Work
- **Code Comments**: Provide comment suggestions for GitHub and other code platforms
- **Technical Documentation**: Improve expression in Wiki and documentation websites
- **Customer Service**: Quickly generate professional replies in CRM systems

### Learning & Research
- **Academic Writing**: Optimize paper expression on academic platforms
- **Note Organization**: Improve content organization in note-taking applications
- **Language Learning**: Get expression suggestions on language learning websites

## 🔄 Changelog

### v1.0.0 (Current Version)
- ✅ Basic conversation functionality
- ✅ Smart text completion
- ✅ Text rewriting optimization
- ✅ Modern UI design
- ✅ Configuration management system
- ✅ Integrated usage guide

## 🤝 Contributing

We welcome community contributions! Please follow these steps:

1. Fork the project repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 🌐 Related Links

- [Chrome AI Documentation](https://developer.chrome.com/docs/ai/)
- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)
- [React Official Documentation](https://reactjs.org/)

## 💡 FAQ

### Q: Why do I need Chrome 138+ version?
A: Chrome's built-in AI functionality is supported starting from version 138, which is a prerequisite for using this extension.

### Q: Does the AI functionality require an internet connection?
A: No. All AI processing is completed on your local device and works completely offline.

### Q: How can I customize AI behavior?
A: In the Context tab, you can set various parameters such as AI role, tone, response length, and more.

### Q: Does the extension collect my data?
A: No. All data is stored locally on your device and is never uploaded to any external servers.

---

**Let AI empower every creation!** 🚀
