# 前端设计报告 03: 数据绑定与架构映射 (Data Binding)

**日期**: 2026-01-02
**基于文档**: `PRODUCT_DESIGN_V2.5.md` & `prisma/schema.prisma`

## 1. 状态管理策略 (State Strategy)

采用 **Server State (SWR)** + **Client State (Zustand)** 的双层架构。

### 1.1 服务端状态 (Data Fetching): SWR
我们选择 Vercel 开发的 `SWR` (Stale-While-Revalidate) 库，因为它完美契合"社交时间线"的实时性需求。

-   **Key**: `/api/messages`, `/api/tags/trending`, `/api/graph/nodes`.
-   **策略**:
    -   `revalidateOnFocus: true`: 窗口切回来时自动刷新。
    -   `dedupingInterval: 2000`: 2秒内防抖。
    -   `optimisticData`: 并不是每次操作都等待服务器，而是先更新本地缓存。

### 1.2 客户端状态 (UI State): Zustand
用于管理与后端数据无关的纯 UI 状态。

-   **Store**: `useAppStore`
-   **State**:
    -   `isSidebarOpen`: 移动端侧边栏开关。
    -   `isFocusMode`: 聚焦模式开关。
    -   `isSearchOpen`: Cmd+K 搜索框开关。
    -   `currentTheme`: 这一部分其实由 `next-themes` 托管。

---

## 2. 架构映射矩阵 (Schema Mapping Matrix)

将 Prisma Schema 映射到具体的 UI 组件。

### 2.1 核心组件：MessageCard

这是时间线上的每一条笔记。

| UI 元素 | 数据源 (Prisma Field) | 说明 |
| :--- | :--- | :--- |
| **头像/昵称** | `message.author.avatar`, `message.author.name` | 需 include author。 |
| **时间** | `message.createdAt` | 使用 `date-fns` 格式化为 "2h ago" 或 "Jan 2"。 |
| **正文** | `message.content` | 支持 Markdown 渲染，需处理 `#Tag` 和 `[[Link]]` 的高亮。 |
| **标签 (Pills)** | `message.tags[].tag.name` | 需 include tags -> tag。显示在底部，带颜色。 |
| **图片/视频** | `message.medias` | 需 include medias。Grid 布局显示缩略图。 |
| **引用/回复** | `message.parent` | 若存在，显示 "Replying to @User" 的小字。 |
| **反向链接** | `message.incomingLinks` | 显示 "3 Backlinks" 徽章。 |
| **星标状态** | `message.isStarred` | UI 显示实心/空心星星。 |

### 2.2 辅助组件：GraphView (知识图谱)

| 节点类型 | 数据源 | 视觉表现 |
| :--- | :--- | :--- |
| **Node (笔记)** | `Message.id`, `Message.title` (or snippet) | 圆形节点。大小 = `incomingLinks.length` (引用数越多越大)。 |
| **Node (标签)** | `Tag.name` | 方形节点。颜色 = `Tag.color`。 |
| **Link (边)** | `MessageLink`, `MessageTag` | 连线。 |

### 2.3 设置页面：AI Configuration

| 表单项 | 数据源 (AiConfig Model) | 权限 |
| :--- | :--- | :--- |
| **API Key** | `aiConfig.openaiApiKey` | 🔒 前端仅接收掩码 (sk-***)，输入时覆盖更新。 |
| **RAG 开关** | `aiConfig.enableRag` | Toggle Switch。 |
| **人设** | `aiConfig.aiPersonality` | Select (Friendly, Professional...)。 |

---

## 3. 数据流示例 (Data Flow Example)

### 场景：用户发送一条新笔记 (Post New Note)

1.  **Trigger**: 用户在 `InputMachine` 按下 Ctrl+Enter。
2.  **Optimistic UI**: 
    -   调用 `mutate('/api/messages', (oldData) => [tempMsg, ...oldData], false)`。
    -   UI 立即显示新卡片 (带 Loading 态)。
3.  **API Request**: `POST /api/messages`。
    -   Payload: `{ content: "Hello world #Idea" }`。
4.  **Backend Processing**:
    -   Prisma 创建 Record。
    -   Worker 提取 `#Idea` 并关联 `Tag` 表。
    -   Worker 扫描 `[[Link]]` 并创建 `MessageLink`。
5.  **Confirmation**:
    -   API 返回 201 Created 及完整 Message 对象 (含 ID)。
    -   SWR `mutate` 更新缓存中的 tempMsg 为真实数据。
6.  **Side Effects**:
    -   Worker 完成 AI 打标后，通过 WebSocket 发送 `message.updated`。
    -   前端收到事件，静默更新卡片上的标签列表。

---

## 4. API 需求清单 (API Requirements)

为了支持上述设计，后端需提供：

-   `GET /api/messages?cursor=xyz&limit=20` (支持游标分页)
-   `GET /api/messages/:id/graph` (获取单条笔记的局部邻居节点)
-   `POST /api/search/smart` (RAG 语义搜索接口)
-   `GET /api/user/config` (获取当前用户配置)

---
