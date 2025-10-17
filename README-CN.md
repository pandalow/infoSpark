# InfoSpark AI - 您的本地AI助手

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Local AI](https://img.shields.io/badge/Powered%20by-Chrome%20Built--in%20AI-FF6B6B?style=flat-square)](https://developer.chrome.com/docs/ai/)

## 🌟 项目简介

InfoSpark AI 是一个基于Chrome内置AI的本地智能助手扩展，为您提供私密、安全的AI文本处理能力。无需API密钥，无需联网，所有处理都在您的本地设备上完成。

## ✨ 核心功能

### 💬 智能对话
- **上下文感知聊天**：AI能够理解当前网页内容，提供相关建议
- **记忆对话历史**：保持对话连贯性，支持多轮深度交流
- **个性化设置**：自定义AI角色和行为风格
- **实时响应**：基于本地AI模型，响应快速无延迟

### ✍️ 智能写作
- **任意文本框补全**：在任何网页的输入框中获得AI文本补全
- **多种写作风格**：
  - 🎨 **语调控制**：休闲、正式、中性
  - 📏 **长度控制**：短、中、长篇幅
  - 📄 **格式支持**：纯文本、Markdown格式
- **上下文共享**：为特定场景提供额外的背景信息
- **实时建议**：输入时自动显示AI建议，按Tab接受

### 🔧 文本优化
- **智能重写**：一键改善现有文本的表达方式
- **风格调整**：
  - 🗣️ **语调转换**：更随意、保持原样、更正式
  - 📝 **格式转换**：支持多种文本格式转换
  - 📊 **长度调整**：缩短、保持、扩展文本长度
- **批量处理**：支持对长文本进行分段优化

### ⚙️ 智能配置
- **双重设置体系**：
  - 📝 Writer设置：控制文本生成行为
  - 🔄 Rewriter设置：控制文本改写风格
- **模板切换**：Writer和Rewriter独立的配置选项卡
- **实时保存**：配置更改自动保存，即时生效
- **重置功能**：一键恢复默认设置

## 🎨 用户界面

### 现代化设计
- **玻璃态美学**：采用磨砂玻璃效果的现代UI设计
- **渐变动效**：流畅的色彩渐变和动画过渡
- **紧凑布局**：专为Chrome侧边栏优化的紧凑界面
- **状态指示**：清晰的AI状态和操作反馈

### 交互体验
- **三大功能模块**：
  - 💬 Chat - 智能对话
  - ⚙️ Context - 配置管理  
  - 📚 Guide - 使用指南
- **展开式指南**：一键查看功能说明，不占用常驻空间
- **即时反馈**：保存成功、状态变更等操作都有清晰提示

## 🚀 开始使用

### 系统要求
- Chrome 浏览器 138+ 版本
- 支持Chrome内置AI功能的设备

### 安装步骤
1. 下载扩展源码
2. 打开Chrome扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `apply/dist` 文件夹

### 快速开始
1. **激活Copilot**：点击扩展图标，在侧边栏中开启Copilot功能
2. **配置上下文**：在Context标签页中设置AI的角色和行为
3. **开始对话**：在Chat标签页与AI进行对话
4. **网页写作**：在任意网页文本框中体验AI补全功能

## 📋 功能详解

### Chat功能
```
特性：
- 基于当前页面内容的上下文对话
- 支持8轮对话历史记忆
- 自定义AI角色设定
- 实时打字响应
```

### Writer功能
```
配置选项：
- tone: casual | formal | neutral
- length: short | medium | long  
- format: plain-text | markdown
- sharedContext: 自定义背景信息
```

### Rewriter功能
```
配置选项：
- tone: more-casual | as-is | more-formal
- format: plain-text | markdown | as-is
- length: shorter | as-is | longer
- sharedContext: 自定义改写指导
```

## 🔒 隐私安全

- **完全本地化**：所有AI处理都在您的设备上进行
- **无数据上传**：不向任何外部服务器发送您的数据
- **离线工作**：无需网络连接即可使用AI功能
- **数据加密**：本地存储的配置数据经过加密处理

## 🛠️ 技术架构

### 前端技术
- **React 18**：现代化的用户界面框架
- **Tailwind CSS**：实用优先的CSS框架
- **Vite**：快速的构建工具和开发服务器

### Chrome扩展
- **Manifest V3**：最新的Chrome扩展标准
- **Service Worker**：后台脚本处理
- **Content Scripts**：网页内容交互
- **Chrome AI API**：内置AI模型调用

### AI模型集成
- **LanguageModel API**：对话和文本生成
- **Writer API**：智能写作辅助
- **Rewriter API**：文本改写优化

## 📖 使用场景

### 日常写作
- **邮件撰写**：在Gmail等邮箱中获得写作建议
- **社交媒体**：在Twitter、LinkedIn等平台优化发文内容
- **文档编辑**：在Google Docs、Notion等平台提升写作效率

### 专业工作  
- **代码注释**：为GitHub等代码平台提供注释建议
- **技术文档**：在Wiki、文档网站中改善表达
- **客服回复**：在CRM系统中快速生成专业回复

### 学习研究
- **论文写作**：在学术平台优化论文表达
- **笔记整理**：在笔记应用中改善内容组织
- **语言学习**：在语言学习网站获得表达建议

## 🔄 更新日志

### v1.0.0 (当前版本)
- ✅ 基础对话功能
- ✅ 智能文本补全
- ✅ 文本重写优化
- ✅ 现代化UI设计
- ✅ 配置管理系统
- ✅ 使用指南集成

## 🤝 贡献指南

我们欢迎社区贡献！请参考以下步骤：

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🌐 相关链接

- [Chrome AI 开发文档](https://developer.chrome.com/docs/ai/)
- [Chrome扩展开发指南](https://developer.chrome.com/docs/extensions/)
- [React 官方文档](https://reactjs.org/)

## 💡 常见问题

### Q: 为什么需要Chrome 138+版本？
A: Chrome内置AI功能从138版本开始支持，这是使用本扩展的前提条件。

### Q: AI功能是否需要网络连接？
A: 不需要。所有AI处理都在您的本地设备上完成，完全离线工作。

### Q: 如何自定义AI的行为？
A: 在Context标签页中，您可以设置AI的角色、语调、响应长度等多种参数。

### Q: 扩展会收集我的数据吗？
A: 不会。所有数据都存储在您的本地设备上，不会上传到任何外部服务器。

---

**让AI助力您的每一次创作！** 🚀