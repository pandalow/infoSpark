# Copilot Web - AI 文本补全 Chrome 扩展

一个基于 Chrome 内置 AI API 的轻量级 "Copilot Web" 扩展，为网页文本编辑器提供智能文本补全和 AI 助手功能。

## ✨ 主要功能

### 🔮 智能文本补全
- **Ghost Text 预览**: 在输入框中显示 AI 建议的灰色预览文本
- **Tab 键接受**: 按 Tab 键快速接受 AI 补全建议
- **上下文感知**: 基于当前文本内容和用户设置的规则提供智能补全
- **多输入框支持**: 支持 textarea、input 和 contenteditable 元素

### 💬 AI 助手聊天
- **侧边面板**: 便捷的 AI 对话界面
- **上下文规则设置**: 自定义代码风格和补全规则
- **对话历史**: 自动保存和管理聊天记录
- **Markdown 支持**: 支持格式化的消息显示

### ⚙️ 智能设置
- **开关控制**: 可随时启用/禁用自动补全
- **个性化配置**: 自定义补全行为和显示效果
- **数据管理**: 导出聊天记录，清空历史数据

## 🚀 安装和使用

### 安装扩展

1. **开发者模式安装**:
   ```bash
   # 1. 打开 Chrome 浏览器
   # 2. 访问 chrome://extensions/
   # 3. 启用"开发者模式"
   # 4. 点击"加载已解压的扩展程序"
   # 5. 选择这个文件夹: chrome-tab-completion-extension
   ```

2. **Chrome AI API 要求**:
   - 需要 Chrome 138+ 版本（最新的Canary或Dev版本）
   - 无需启用实验性功能标志
   - 首次使用时会自动下载 Gemini Nano 模型

### 基本使用

#### 文本补全功能
1. **在任意网页的文本输入框中开始输入**
2. **等待 AI 建议出现**（灰色预览文本）
3. **按 Tab 键接受建议**，或继续输入忽略建议
4. **按 Esc 键取消当前建议**

#### AI 助手对话
1. **点击扩展图标**打开侧边面板
2. **设置上下文规则**来指导 AI 的行为：
   ```
   示例规则：
   - 使用 React Hooks 而不是 Class 组件
   - 遵循 ESLint 规则
   - 编写简洁的代码注释
   - 优先使用 TypeScript
   ```
3. **在聊天区域与 AI 对话**，讨论编程问题
4. **按 Ctrl+Enter 发送消息**

## 🛠️ 技术架构

```
┌─────────────────────────┐
│    Chrome AI API        │
│  (内置语言模型)          │
└─────────┬───────────────┘
          │
┌─────────┴───────────────┐
│   Background Worker     │
│ - AI 会话管理           │
│ - 消息路由              │
│ - 设置存储              │
└─────────┬───────────────┘
          │
┌─────────┴───────────────┐
│   Content Script        │
│ - 输入框监听            │
│ - Ghost Text 显示       │
│ - 补全逻辑              │
└─────────────────────────┘

┌─────────────────────────┐
│   Side Panel            │
│ - AI 对话界面           │
│ - 设置管理              │
│ - 历史记录              │
└─────────────────────────┘
```

## 📁 项目结构

```
chrome-tab-completion-extension/
├── manifest.json                 # 扩展配置文件
├── src/
│   ├── background.js            # 后台服务 Worker
│   ├── content/
│   │   ├── content.js          # 内容脚本（主要功能）
│   │   └── content.css         # 内容脚本样式
│   ├── sidepanel/
│   │   ├── sidepanel.html      # 侧边面板 HTML
│   │   ├── sidepanel.css       # 侧边面板样式
│   │   └── sidepanel.js        # 侧边面板逻辑
│   └── utils/
│       └── storage.js          # 工具函数和存储管理
├── icons/                       # 扩展图标
└── README.md                    # 说明文档
```

## 🔧 开发和自定义

### 本地开发

1. **修改代码后重新加载扩展**:
   ```bash
   # 在 chrome://extensions/ 页面点击扩展的"重新加载"按钮
   ```

2. **调试**:
   - Background Script: 在扩展详情页点击"服务工作进程"
   - Content Script: 在网页上按 F12，查看 Console
   - Side Panel: 在侧边面板上右键 -> 检查

### 自定义配置

#### 修改 AI 行为
在 `background.js` 中的 `buildCompletionPrompt` 函数：
```javascript
function buildCompletionPrompt(context, currentText, cursorPosition, contextRules) {
  let prompt = "自定义你的提示词...";
  // 修改这里来调整 AI 的行为
}
```

#### 调整补全触发时机
在 `content.js` 中修改防抖延迟：
```javascript
this.debounceTimer = setTimeout(() => {
  this.requestCompletion();
}, 500); // 修改这个数值（毫秒）
```

## 🎯 使用场景

- **代码编写**: 在 GitHub、CodePen、JSFiddle 等平台编写代码
- **文档撰写**: 在线编辑器中撰写技术文档
- **邮件编写**: Gmail、Outlook 等邮件客户端
- **社交媒体**: Twitter、Reddit 等平台发布内容
- **表单填写**: 各种网页表单的智能填写

## ⚠️ 注意事项

1. **隐私保护**: 
   - 扩展使用 Chrome 本地 AI，数据不会发送到外部服务器
   - 聊天记录存储在本地浏览器中

2. **兼容性**:
   - 需要 Chrome 138+ 版本（目前在 Canary/Dev 版本中可用）
   - 使用Chrome内置的Gemini Nano模型
   - 某些网站可能有 CSP 限制

3. **性能优化**:
   - 使用防抖机制避免频繁 API 调用
   - 智能缓存减少重复请求

## 🔮 未来计划

- [ ] 支持更多编辑器类型（Monaco、CodeMirror）
- [ ] 添加多语言支持
- [ ] 实现代码语法高亮
- [ ] 支持自定义快捷键
- [ ] 添加使用统计和分析

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**Copilot Web** - 让 AI 助力你的网页编辑体验 🚀

## Installation
1. Download or clone the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `chrome-tab-completion-extension` directory.

## Usage
- Once installed, the extension will automatically activate when you focus on a `<textarea>`.
- Start typing, and suggestions will appear as ghost text.
- Press the Tab key to complete the text based on the suggestions.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.