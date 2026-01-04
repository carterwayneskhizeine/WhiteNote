# 前端设计报告 02: 交互与流程 (Interactions & Flows)

**日期**: 2026-01-02
**基于文档**: `PRODUCT_DESIGN_V2.5.md`

## 1. 核心交互：输入时光机 (The Input Machine)

输入框不仅仅是一个 Textarea，它是系统的核心。

### 1.1 组件架构
基于 **Tiptap** (Headless Editor) 构建。

-   **外观**: 
    -   初始状态: 单行文本框，占位符 "What's on your mind? Type '/' for commands..."
    -   Focus 状态: 自动展开，底部出现工具栏 (Toolbar)。
-   **Slash Command (/) 菜单**:
    -   输入 `/` 触发悬浮菜单 (`tiptap-extension-floating-menu`)。
    -   **选项**:
        -   📝 **Text**: 普通文本
        -   ✅ **Todo**: 待办列表
        -   🖼️ **Image**: 上传图片
        -   🤖 **Ask AI**: 呼叫 AI 助手
        -   📄 **Template**: 插入模板 (二级菜单: Daily, Idea...)

### 1.2 提交体验 (The Posting Experience)
-   **快捷键**: `Ctrl + Enter` (Desktop) 或 点击发送按钮。
-   **乐观更新 (Optimistic UI)**:
    1.  用户点击发送。
    2.  立即将内容构造为临时 `Message` 对象，插入到 `SWR` 或 `React Query` 的缓存列表顶端。
    3.  卡片显示 "Sending..." 状态 (半透明或小 Spinner)。
    4.  后台 API 请求成功 -> 更新为正式 ID，状态消失。
    5.  后台 API 请求失败 -> 卡片变红，显示 "Retry"。

---

## 2. 时间线交互 (Timeline Interactions)

### 2.1 无限滚动 (Infinite Scroll)
-   **技术**: `IntersectionObserver` + `useSWRInfinite`。
-   **行为**: 滚动到底部前 500px 自动预加载下一页。
-   **新消息提示**: 当用户向下滚动浏览历史时，如果有新消息进来（来自 WebSocket 或其他端），顶部显示 "New Tweets" 悬浮胶囊按钮，点击回到顶部。

### 2.2 Thread 展开 (The Thread UX)
参考 Twitter 的设计，而不是 Notion 的无限嵌套。

-   **列表视图**: 仅显示 `Parent` 消息。如果该消息有 `Children`，显示 "Show X replies" 链接。
-   **点击行为**: 
    -   点击消息卡片 -> 跳转到 **详情页 (Detail View)**。
    -   详情页结构:
        -   **Ancestors**: 父消息连线 (如有)。
        -   **Focus**: 当前消息 (大字号，高亮)。
        -   **Replies**: 子消息列表。

### 2.3 双向链接 (Bi-directional Links)
-   **输入时**: 输入 `[[` 触发 `Mention` 插件，弹出搜索框搜索已有笔记标题。
-   **浏览时**: 
    -   点击链接 -> 路由跳转。
    -   **Hover Card**: 鼠标悬停在 `[[Link]]` 上时，通过 Portal 渲染一个悬浮卡片，显示目标笔记的前 100 字摘要。

---

## 3. AI 反馈循环 (AI Feedback Loops)

AI 既是工具也是伙伴，需要恰当的反馈。

### 3.1 隐形助手 (Auto-tagging)
-   用户发帖后，UI 不需等待 AI。
-   **后台处理**: 几秒后，当 WebSocket 推送 `message.updated` 事件（包含新标签）时：
    -   UI 上的标签区域出现微光动画 (Shimmer Effect)。
    -   新标签淡入显示 (Fade in)。

### 3.2 显性对话 (Chat)
-   **呼出**: 在评论区输入 `@goldierill` 或点击 `/ai ask`。
-   **思考状态**: 
    -   显示 "Goldie is thinking..." 骨架屏。
    -   如果是流式输出 (Streaming)，则实时打字机效果显示内容。
    -   **引用来源**: 如果是 RAG 模式，回答底部显示 "Sources: [Note A], [Note B]"。

---

## 4. 实时同步反馈 (Realtime Sync)

基于 `Socket.io`。

-   **编辑锁定**: 当检测到其他端正在编辑当前笔记时 (收到 `edit:start` 事件)：
    -   当前编辑器右上角显示 "📱 Mobile is editing..."。
    -   输入框设为只读，避免冲突，并且高亮显示对方光标，直到编辑完成所有设备再恢复编辑状态，同时只能有一个设备编辑。
-   **动态更新**: 时间线上评论数变化实时跳动更新。

---