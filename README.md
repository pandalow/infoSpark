# InfoSpark AI - Advanced Local AI Writing Assistant

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Local AI](https://img.shields.io/badge/Powered%20by-Chrome%20Built--in%20AI-FF6B6B?style=flat-square)](https://developer.chrome.com/docs/ai/)
[![Devpost](https://img.shields.io/badge/Devpost-Hackthon-brightgreen?style=flat-square)](https://devpost.com/software/apply-day)

<div align="center">
  <a href="docs/README-CN.md" style="margin-right: 20px; text-decoration: none; font-size: 18px;">中文</a>
  <a href="README.md" style="text-decoration: none; font-size: 18px;">English</a>
</div>


<iframe width="640" height="360" src="https://www.youtube.com/embed/kPUfK7g99Tw" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Overview

InfoSpark AI is a sophisticated Chrome extension that harnesses Chrome's built-in AI capabilities to provide **context-aware writing assistance**, **intelligent text completion**, and **real-time streaming responses**. Featuring a **modular architecture** with advanced **session management**, **streaming communication**, and **draggable interface design**, InfoSpark AI delivers a seamless, privacy-first writing experience that works entirely offline.

## Story
It’s quite interesting how this idea started, it actually grew out of my own job-hunting journey. As a native Chinese speaker studying in Ireland, I often found myself struggling when filling out online job applications, writing emails to recruiters, or networking with friends. My language skills alone weren’t always enough to handle every situation, and I didn’t have any handy tool to help me polish or optimize my writing.

That’s when I started thinking: what if there was a tool that could instantly refine poor text, automatically generate useful content, and even predict what I might want to say next? As a regular user of code agents, I realized that the Copilot-style interaction perfectly matched what I needed simple, smart, and intuitive for everyday users. I saw it as the ideal way to make text writing more efficient and accessible.

I was genuinely grateful to see Google’s open initiative. It feels like a real gift to the open-source community, timely, empowering, and inspiring!

## Features
![Model](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/095/datas/original.png)
### Advanced Multi-turn Chat
- **Page Context Integration**: AI understands current webpage content automatically
- **Conversation Continuity**: Maintains 8-round conversation history with smart memory
- **Language Switching**: Dynamic language preference with instant context updates
- **Streaming Responses**: Real-time message generation for natural conversations
![chatbot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/096/datas/original.png)

### Context-Aware Copilot/Assistant
- **Smart Context Detection**: Three-level context awareness (none/paragraph/full-page)
- **Real-time Streaming**: Live text completion with **AbortController** interruption
- **Draggable Panel**: Fully customizable floating interface with position memory
- **Intelligent Stopping**: Smart sentence completion with word-count optimization
- **Debounced Input**: Efficient request handling with intelligent caching
![copilot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/097/datas/original.png)
### Professional Writing Suite
- **Universal Input Support**: Works in any text field across all websites
- **Three AI Modes**:
  - **Smart Completion**: Context-aware sentence completion
  - **Creative Writer**: Generate new content from prompts
  - **Intelligent Rewriter**: Enhance existing text with style control
- **Streaming Output**: All responses stream in real-time for responsive UX
- **Keyboard Integration**: Press Tab to instantly accept completions

### Granular Control System
- **Multi-level Context**: Choose between no context, paragraph-level, or full-page context
- **Advanced Configuration**:
  - **Tone Control**: Casual, formal, neutral, as-is
  - **Length Management**: Short, medium, long, shorter, longer
  - **Format Options**: Plain text, Markdown with intelligent conversion
  - **Context Length**: Customizable context window (1000-3000 chars)

## Quick Start Guide

### Prerequisites
- Chrome Browser 138+ (Required for built-in AI)
- Device with AI model support capability
* Before you start using that, please check

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/infospark-ai.git
   cd infospark/
   ```

2. **Build the extension**
   ```bash
   npm install
   npm run build
   ```

3. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `infospark/dist` folder

### Getting Started
1. **Activate Copilot**: Click extension icon → Enable Copilot in sidebar
2. **Configure Context**: Set AI behavior and context level in Context tab
3. **Start Writing**: Type in any text field → AI suggestions appear automatically
4. **Chat Experience**: Use Chat tab for conversational AI assistance

## Advanced Technical Architecture

### Modular Backend Design
```typescript
// Background Service Architecture
├── MessageHandler     // Unified message routing & error handling
├── StateManager      // Persistent Copilot state & tab management  
├── SessionManager    // AI model lifecycle with intelligent cleanup
├── StreamHandler     // Real-time streaming with multi-stream support
└── AIAssistantBackground // Main orchestrator & Chrome API integration
```

### 📡 Sophisticated Communication System
- **Chrome Messaging API**: Command-based communication through `MessageHandler`, Promise-based async patterns with unified error handling, Automatic message routing to appropriate handlers, Session lifecycle management (create, reset, status checks).

- **Chrome Ports API**: Persistent bidirectional connections for real-time operations，**Multi-stream Management**: Concurrent completion, writer, and rewriter streams, **AbortController Integration**: User-controlled stream interruption, **Smart Resource Cleanup**: Automatic connection cleanup on disconnection

- **Chrome Storage API**: Intelligent state and context management, **Context Caching**: Page text snapshots with smart invalidation, **Position Memory**: Draggable panel position persistence,  **Configuration Sync**: Real-time settings synchronization

### Modern Frontend Stack
- **React 18**: Modern component architecture with hooks
- **Tailwind CSS**: Utility-first responsive design
- **Vite**: Lightning-fast development and optimized builds
- **Glass Morphism UI**: Modern frosted glass design language

### Intelligent Content Script
- **Draggable Interface**: Fully customizable floating panel with smooth animations
- **Smart Event Handling**: Debounced input with intelligent change detection
- **Context Collection**: Multi-level text extraction with metadata analysis
- **Cache Management**: Element-specific caching with time-based invalidation


## Privacy & Security Excellence

- **100% Local Processing**: All AI operations on-device, zero cloud dependency
- **No Data Transmission**: Never sends data to external servers
- **Offline Functionality**: Full feature set works without internet
- **Encrypted Storage**: Local configuration data protection
- **Memory Management**: Intelligent cleanup prevents data leaks
- **Session Isolation**: Each tab maintains separate context

## Version History
### v 0.0.1(Current - Major Architecture Overhaul)
- ✅ **Complete Backend Refactor**: Modular architecture with clean separation
- ✅ **Advanced Streaming**: Multi-stream support with AbortController
- ✅ **Draggable Interface**: Fully customizable floating panel
- ✅ **Smart Context**: Three-level context awareness system
- ✅ **Intelligent Caching**: Element-specific cache with invalidation
- ✅ **Performance Optimization**: Debounced operations and resource pooling

### v test (Legacy)
- ✅ Basic conversation functionality
- ✅ Simple text completion
- ✅ Text rewriting optimization
- ✅ Initial UI design

## Contributing Guidelines

We welcome contributions! Please follow our development workflow:

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-username/infospark-ai.git
cd infospark-ai/apply

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Code Standards
- **ESLint**: Follow provided linting rules
- **TypeScript**: Use type annotations where beneficial
- **Comments**: Document complex logic and architecture decisions
- **Testing**: Add tests for new features

### Pull Request Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request with detailed description

## Troubleshooting

### Common Issues
1. **AI Not Available**: Ensure Chrome 138+ and AI feature enabled
2. **Panel Not Appearing**: Check extension permissions and reload page
3. **Slow Responses**: Verify local AI model is downloaded
4. **Context Issues**: Clear cache and restart browser

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Resources & Documentation

- **[Chrome AI Documentation](https://developer.chrome.com/docs/ai/)**
---

**🚀 Empowering intelligent writing with local AI excellence!**

*Built with ❤️ for privacy-conscious creators*
