
下面按导师模式给出可执行的分步任务清单（MVP → 完整功能），每一步都包含目标、修改的文件/位置、测试方法和估算时间。按序完成并在每步通过测试再进入下一步。

总体说明（先读）

运行环境：Chrome 138+（建议 Canary/Dev），manifest v3，使用 ai.gemini-on-device 样式的 LanguageModel API。
消息约定（统一）：AI_COMPLETION / CHAT_WITH_AI / GET_AI_STATUS / SET_CONTEXT_RULES。
超时与重试：补全超时 8s，聊天超时 15s，会话创建超时 10s，重试最多 2 次。
隐私原则：只上传页面片段（≤1000 字符），提供侧边 panel 开关与域白名单。
MVP（能端到端跑通）—— 约 4–8 小时

准备 manifest 与基本结构

目标：确认 manifest.json 注册 content script、background service worker、side panel/popup。
修改文件：manifest.json
测试：chrome://extensions 加载已解压扩展能看到 service worker 和 content 注入。
估时：15–30 分钟
Content Script 基础注入与日志

目标：在 test.html 注入 content.js，识别并监听单行 input/textarea 的 focus/input/keydown。
修改文件：src/content/content.js（或 apply/src/content）
测试：在 test.html 输入时 console.log 能看到事件。
估时：30–60 分钟
Background 的消息监听骨架

目标：实现 chrome.runtime.onMessage 处理框架，能接收 AI_COMPLETION、CHAT_WITH_AI 并返回占位结果（同步）。
修改文件：src/background.js
测试：content 发消息请求补全，background 返回固定字符串，content 能收到并渲染到 console。
估时：30–60 分钟
Ghost text 简易实现（单行 input）

目标：显示灰色候选文本，位置基于测量 span，Tab 接受（preventDefault）。
修改文件：src/content/content.js、content.css
测试：输入触发占位补全，显示灰色文本，按 Tab 插入到 input。
估时：1–2 小时
将侧边面板（React）接入消息通道（聊天 stub）

目标：在 React 的 Chat 组件（Chat.jsx）提供输入并发送 CHAT_WITH_AI 消息到 background，background 返回占位回复并显示。
修改文件：apply/src/components/Chat.jsx、src/sidepanel/sidepanel.js（若 sidepanel 用静态页面则同步）
测试：侧边 panel 发送消息能收到回复并渲染。
估时：1 小时
把真实模型接上（LanguageModel，按 demo 风格）—— 约 2–4 小时 6. 引入 LanguageModel 调用封装

目标：在 background 中实现 generateCompletionFromModel(prompt) 按示例使用 LanguageModel.params()/LanguageModel.create({ initialPrompts, ... })，包含超时与重试。
修改文件：src/background.js（实现 generateCompletionFromModel）
要点：用 try/catch、Promise.race 做超时；创建后尽快销毁会话；日志详细。
测试：在 Canary 环境下能创建 session（日志）、短 prompt 能返回结果。
估时：1–2 小时
在 background 合并上下文并返回补全
目标：接收 content 发来的 pageContext + editorContent + sidepanel 存储的 contextRules，构造 prompt 并调用模型。
修改文件：src/background.js（AI_COMPLETION handler）
测试：console 打印合并后的 prompt；模型返回内容并显示在 content ghost。
估时：30–60 分钟
稳定性与用户体验（完善）—— 约 3–6 小时 8. 消息通道健壮化

目标：确保 onMessage 返回 true 时在所有分支都调用 sendResponse，增加超时 fallback（sendResponse({error})）。
修改文件：src/background.js、src/content/content.js
测试：模拟后台超时/错误，前端能收到明确错误而不是“channel closed”或“context invalidated”。
估时：30–60 分钟
解决 “Extension context invalidated”

目标：缩短耗时任务、会话按需创建、实现保活心跳或重试逻辑；在 content 侧增加超时重试提示。
修改文件：src/background.js、src/content/content.js
测试：对慢请求触发重试或友好错误提示，不导致 SW 被回收导致未响应。
估时：1–2 小时
Ghost text 精准定位与 textarea 支持

目标：完善光标测量支持多行 textarea，考虑行高、padding、scroll。
修改文件：src/content/content.js、content.css
测试：在多行 textarea 正确显示 ghost 且随光标移动。
估时：1–2 小时
将侧边 panel 的用户规则整合进 prompt

目标：保存 contextRules 到 chrome.storage.local；background 在生成 prompt 时读取并合并。
修改文件：apply/src/components/User.jsx、src/sidepanel/sidepanel.js、src/background.js
测试：修改规则后补全风格变化（可在 prompt 日志中观察）。
估时：30–60 分钟
权限、白名单与隐私开关

目标：增加域白名单和“允许发送页面内容”开关，只在允许的站点上传上下文。
修改文件：sidepanel.js、content.js、background.js、manifest（若需 activeTab）
测试：在非白名单站点不发送页面内容，UI 显示“被禁用”状态。
估时：30–60 分钟
可选增强（按需） 13. 缓存与去抖 - 缓存相似上下文的补全结果；对输入做防抖（300ms）。 14. 流式输出与增量补全 - 若 LanguageModel 支持流式响应，逐字符/逐词显示 ghost。 15. 富编辑器适配（CodeMirror/Monaco） - 写适配器监听编辑器 API 的光标与编辑事件。

每步的具体实现提示（快捷参考）

sendMessageWithTimeout 在 content 端包装 chrome.runtime.sendMessage，一律检测 chrome.runtime.lastError。
在 background 的 onMessage 使用 (msg, sender, sendResponse) => { (async ()=>{...})(); return true; } 并在所有分支 sendResponse(...)。
LanguageModel 模式示例（伪）：
const defaults = await LanguageModel.params();
const session = await Promise.race([LanguageModel.create(params), timeoutPromise(10000)]);
const resp = await Promise.race([session.send({input: prompt}), timeoutPromise(8000)]);
session.close && session.close();
限制发送内容长度：page snippet ≤ 1000 字符，editor 前后片段合计 ≤ 600 字符。
如何按天/小时分配

第一天（6–8小时）：完成 1–5（MVP 可演示）。
第二天（4–6小时）：完成 6–9（接入模型与稳定性）。
第三天（2–4小时）：完成 10–12 与优化。
如果你愿意，我可以现在为你生成：

background.generateCompletionFromModel 的具体实现（按 ai.gemini-on-device demo）；
content.js 的单行 input ghost text 完整实现；
Chat.jsx 的 React 端发送/显示示例。
选一个我立刻为你产出具体代码。