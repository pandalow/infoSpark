# Apply Day - LinkedIn Job Description Extractor

一个用于提取 LinkedIn 职位描述的浏览器扩展。

## 功能特性

- 🎯 自动检测 LinkedIn 职位页面
- 📄 提取完整的职位描述文本段落
- 🏷️ 智能分类职责和要求
- 💾 本地存储提取的数据
- 📊 美观的用户界面展示
- 📁 支持导出 JSON 格式数据

## 使用方法

1. **安装扩展**
   - 在 Chrome 中打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择此项目文件夹

2. **提取职位信息**
   - 访问任意 LinkedIn 职位页面（格式：`https://linkedin.com/jobs/view/职位ID`）
   - 点击浏览器工具栏中的扩展图标
   - 扩展会自动提取页面中的职位信息
   - 如果没有自动提取，点击"提取当前页面数据"按钮

3. **查看提取结果**
   - 职位标题、公司、地点
   - 所有文本段落列表
   - 自动分类的职责和要求
   - 统计信息（段落数、职责数、要求数）

4. **导出数据**
   - 点击"导出数据"按钮
   - 数据将以 JSON 格式下载到本地

## 技术架构

### 文件结构
```
/
├── manifest.json              # 扩展配置文件
├── popup.html                 # 弹窗界面
├── src/
│   └── scripts/
│       ├── content.js         # 内容脚本（注入LinkedIn页面）
│       ├── background.js      # 背景脚本（消息处理）
│       └── popup.js          # 弹窗逻辑脚本
```

### 工作流程
1. **内容脚本注入**: 当访问LinkedIn职位页面时，`content.js` 自动注入
2. **DOM解析**: 使用多种CSS选择器提取职位信息
3. **数据分类**: 基于关键词智能分类职责和要求
4. **消息传递**: 通过Chrome API将数据发送到背景脚本
5. **数据存储**: 背景脚本将数据保存到本地存储
6. **界面展示**: popup界面从存储中读取并展示数据

### 关键特性
- **智能等待**: 处理LinkedIn的动态加载内容
- **多选择器**: 支持LinkedIn界面的不同版本
- **SPA支持**: 监听单页应用的路由变化
- **错误处理**: 完善的错误捕获和用户反馈
- **数据持久化**: 本地存储确保数据不丢失

## 支持的LinkedIn页面
- 职位详情页: `https://*.linkedin.com/jobs/view/*`
- 适配不同的LinkedIn界面版本
- 支持中文和英文页面

## 开发说明

如果要用React开发popup界面：
1. 创建React项目：`npx create-react-app popup-react`
2. 开发React组件替代当前的popup.html和popup.js
3. 构建：`npm run build`
4. 将构建产物复制到扩展目录
5. 更新manifest.json中的popup路径

## 注意事项
- 此扩展仅在LinkedIn职位页面工作
- 需要开启开发者模式才能安装
- 提取的数据仅保存在本地，不会上传到服务器
- LinkedIn页面结构可能变化，如遇问题请更新选择器