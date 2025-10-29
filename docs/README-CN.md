<div align="center">

# InfoSpark AI - 本地AI Copilot Chrome插件

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Local AI](https://img.shields.io/badge/Powered%20by-Chrome%20Built--in%20AI-FF6B6B?style=flat-square)](https://developer.chrome.com/docs/ai/)

<a href="README-CN.md" style="margin-right: 20px; text-decoration: none; font-size: 18px;">中文</a>
<a href="../README.md" style="text-decoration: none; font-size: 18px;">English</a>

## 演示视频
[![在 YouTube 上观看演示](https://img.youtube.com/vi/kPUfK7g99Tw/0.jpg)](https://www.youtube.com/watch?v=kPUfK7g99Tw)

</div>

## 概览

InfoSpark AI 是一个功能完善的 Chrome 扩展，利用 Chrome 内置的本地 AI 能力，提供上下文感知的写作辅助、智能文本补全以及实时流式响应。系统采用模块化架构，具备会话管理、流式通信和可拖拽界面等高级设计，带来无缝、以隐私为先的本地离线写作体验。

## 背景故事
这个想法源自我的求职经历。作为一名在爱尔兰学习的中文母语者，我经常在填写在线求职申请、给招聘人员发邮件或与朋友进行职业交流时遇到困难。仅靠语言能力并不足以应对所有场景，也缺少一款顺手的工具帮助我润色或优化表达。

因此我开始思考：如果有一个工具，能即时优化拙劣文本、自动生成有用内容，甚至预测我接下来想说什么，会怎样？作为代码智能体的常用用户，我意识到 Copilot 式交互非常契合普通用户的需求——简单、智能、直观。我认为这正是提升文本创作效率与可达性的理想方式。

我很感谢 Google 的开放举措。这对开源社区来说就像一份礼物，及时、有力、鼓舞人心。

顺便说一句：如果您有相关工作机会，欢迎通过邮箱与我联系：[zxj000hugh@gmail.com]。

## 功能
![Model](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/095/datas/original.png)
### 多轮对话
- 页面上下文集成：AI 可自动理解当前网页内容
- 对话连贯：保留 8 轮对话历史并具备智能记忆
- 语言切换：动态语言偏好，快速更新上下文
- 流式输出：实时生成自然对话
![chatbot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/096/datas/original.png)

### 上下文感知的助手
- 智能上下文检测：三挡上下文感知（无/段落/整页）
- 实时流式：借助 AbortController 支持的实时补全与中断
- 可拖拽面板：可自定义的悬浮界面，记忆位置
- 智能停句：更自然的句子补全与字数控制
- 防抖输入：高效请求与智能缓存
![copilot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/910/097/datas/original.png)

### 专业写作套件
- 通用输入支持：适用于任意网站的文本框
- 三种 AI 模式：
  - 智能补全：基于上下文的句子补全
  - 创作写手：根据提示生成新内容
  - 智能改写：在保持语义的前提下优化表达与风格
- 流式输出：响应式用户体验
- 键盘集成：按 Tab 即可接受补全

### 细粒度控制
- 多级上下文：无、段落级、整页级可选
- 高级配置：
  - 语调：随意、正式、中性、保持原样
  - 长度：短、中、长、缩短、加长
  - 格式：纯文本、Markdown（含智能转换）
  - 上下文长度：自定义上下文窗口（1000-3000 字符）

## 快速上手

### 先决条件
- Chrome 浏览器 138+（需要内置 AI）
- 设备需支持本地 AI 模型
  - 使用前请访问 [Chrome Built-in AI 文档](https://developer.chrome.com/docs/ai/built-in) 确认设备支持本地模型

注意：由于本扩展尚未注册到 Chrome AI 的实验模型源中，请按照以下步骤操作：
- 在浏览器地址栏打开：
  - chrome://flags/#writer-api-for-gemini-nano
  - chrome://flags/#rewriter-api-for-gemini-nano
  - chrome://flags/#prompt-api-for-gemini-nano
- 将以上三项设置为 Enabled，并点击 Relaunch 或重启 Chrome。

### 安装
1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/infospark-ai.git
   cd infospark/
   ```

2. 构建扩展
   ```bash
   npm install
   npm run build
   ```

3. 在 Chrome 中加载
   - 打开 `chrome://extensions/`
   - 启用“开发者模式”
   - 点击“加载已解压的扩展程序”
   - 选择 `infospark/dist` 目录

### 开始使用
1. 启用 Copilot：点击扩展图标 → 在侧边栏启用 Copilot
2. 配置上下文：在 Context 标签页设置 AI 行为与上下文级别
3. 开始写作：在任意文本框中输入 → 自动出现 AI 建议
4. 对话体验：在 Chat 标签页进行对话式交互

## 高级技术架构

### 模块化后端设计
```typescript
// 后台服务架构
├── MessageHandler     // 统一消息路由与错误处理
├── StateManager      // 持久化 Copilot 状态与标签页管理
├── SessionManager    // AI 模型生命周期与智能清理
├── StreamHandler     // 实时流式通信，多流支持
└── AIAssistantBackground // 主协调器与 Chrome API 集成
```

### 通信系统
- Chrome Messaging API：通过 MessageHandler 进行基于命令的通信；基于 Promise 的异步模式与统一错误处理；自动路由到对应处理器；会话生命周期管理（创建、重置、状态检查）。

- Chrome Ports API：用于实时操作的持久双向连接；多流管理：并发的补全、写作与改写流；AbortController 集成：支持用户中断；智能资源清理：断开时自动清理。

- Chrome Storage API：智能状态与上下文管理；上下文缓存：页面文本快照与智能失效；位置记忆：可拖拽面板位置持久化；配置同步：设置的实时同步。

### 现代前端栈
- React 18：现代组件与 Hooks 架构
- Tailwind CSS：实用优先的响应式设计
- Vite：快速开发与优化构建
- 玻璃态 UI：磨砂玻璃风格的设计语言

### 智能内容脚本
- 可拖拽界面：带平滑动画的悬浮面板
- 智能事件：输入防抖与变更检测
- 上下文采集：多级文本抽取与元数据分析
- 缓存管理：元素级缓存与基于时间的失效

## 隐私与安全

- 本地处理：所有 AI 操作在设备本地完成，无云端依赖
- 无数据传输：不向外部服务器发送任何数据
- 离线可用：无需联网即可使用完整功能
- 加密存储：本地配置数据受保护
- 内存管理：智能清理避免数据泄漏
- 会话隔离：每个标签页维护独立上下文

## 版本历史
### v 0.0.1（当前 - 架构大改）
- 完整的后端重构：模块化架构与清晰分层
- 高级流式：多流支持与 AbortController 集成
- 可拖拽界面：完全自定义的悬浮面板
- 智能上下文：三档上下文感知系统
- 智能缓存：元素级缓存与失效策略
- 性能优化：防抖与资源复用

### v test（旧版）
- 基础对话功能
- 简单文本补全
- 文本改写优化
- 初版界面

## 贡献指南

欢迎贡献！请遵循以下开发流程：

### 开发环境
```bash
# 克隆仓库
git clone https://github.com/your-username/infospark-ai.git
cd infospark-ai/apply

# 安装依赖
npm install

# 启动开发
npm run dev

# 生产构建
npm run build
```

### 代码规范
- ESLint：遵循提供的规则
- TypeScript：在合适位置使用类型标注
- 注释：为复杂逻辑与架构决策添加文档
- 测试：为新特性补充测试

### Pull Request 流程
1. Fork 项目
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送分支（`git push origin feature/amazing-feature`）
5. 提交 Pull Request 并附上说明

## 故障排查

### 常见问题
1. AI 不可用：确认 Chrome 版本 ≥ 138 且已启用 AI 功能
2. 面板未显示：检查扩展权限并刷新页面
3. 响应缓慢：确认本地 AI 模型已下载
4. 上下文异常：清除缓存并重启浏览器

## 许可协议

本项目使用 MIT 协议，详情见 [LICENSE](LICENSE)。

## 参考与文档

- [Chrome AI 文档](https://developer.chrome.com/docs/ai/)

---

以本地 AI 能力，赋能高效的智能写作。