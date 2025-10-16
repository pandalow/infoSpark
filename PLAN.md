### Logic:
<!-- 1. 加入Translator - 补全模式  --> 先搁置, rewriter也具备翻译方法.
2. [Partial Done]加入 context 管理
    * new - 更新后创建新的chat session
    * new - 还未处理writer和rewriter的上下文
    * new - 还未处理topk和temeperature两个值

3. [Done]session 管理
    * [Done] 在辅助功能开启后, 每次启动一个session(completion/translator/writer/rewriter)
    * [Done] 同期保有两个session(prompt / 辅助)
4. [Partial Done]优化页面样式和结构
    * 不同屏幕适配不同
    * 背景没有长度足够
    *
5. [Done]重新调整防抖机制
6. [Done]重新调整补全的缓存机制
7. [Done]默认初始化copilot, 关闭copilot
8. 线程管理， chat和copilot不能进行多线程同步



### AI
1. 补完能力稀烂， 需要优化补完的功能
2. Rewriter和Writer的参数和上下文需要支持配置 


### Docs:
1. 项目文件
2. UI 设计稿
3. 项目架构图
4. README File