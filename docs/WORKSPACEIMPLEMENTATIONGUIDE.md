这里是 **Workspace 和 RAGFlow 相关的所有代码文件**，按功能分类：

## 🔌 RAGFlow API 集成文件

| 文件                                                                                                                                 | 说明               | 关键功能                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| [src/lib/ai/ragflow.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ai/ragflow.ts)               | RAGFlow API 核心实现 | `callRAGFlowWithChatId`, `syncToRAGFlow`, `deleteFromRAGFlow`, `updateRAGFlow` |
| [src/lib/ragflow/provision.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ragflow/provision.ts) | RAGFlow 资源自动配置   | `provisionRAGFlowForWorkspace` - 创建 Dataset + Chat                             |
| [src/lib/ai/config.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ai/config.ts)                 | AI 配置管理          | `getAiConfig`, `updateAiConfig` - API Key 加密存储                                 |
| [src/lib/ai/openai.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ai/openai.ts)                 | OpenAI API 兼容接口  | `callOpenAI`, `buildSystemPrompt` - AI 人设                                      |

## 🌐 Workspace API 端点文件

|文件|路由|功能|
|---|---|---|
|[src/app/api/workspaces/route.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/app/api/workspaces/route.ts)|GET/POST `/api/workspaces`|获取列表 / 创建（自动配置 RAGFlow）|
|[src/app/api/workspaces/[id]/route.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/app/api/workspaces/%5Bid%5D/route.ts)|PATCH/DELETE `/api/workspaces/[id]`|更新配置 / 删除（同时删除 RAGFlow 资源）|
|[src/app/api/workspaces/[id]/initialize-ragflow/route.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/app/api/workspaces/%5Bid%5D/initialize-ragflow/route.ts)|POST `/api/workspaces/[id]/initialize-ragflow`|为现有工作区初始化 RAGFlow|
|[src/app/api/ai/chat/route.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/app/api/ai/chat/route.ts)|POST `/api/ai/chat`|AI 聊天接口，使用工作区的 RAGFlow Chat ID|

## 🗄️ 数据库模型文件

|文件|模型|说明|
|---|---|---|
|[prisma/schema.prisma](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/prisma/schema.prisma)|`Workspace`|包含 `ragflowDatasetId`, `ragflowChatId`, `enableAutoTag`, `enableBriefing`|
||`AiConfig`|用户级 RAGFlow 配置|

## ⚙️ 队列处理器文件

|文件|功能|
|---|---|
|[src/lib/queue/processors/auto-tag.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/queue/processors/auto-tag.ts)|自动打标签，完成后触发 RAGFlow 同步|
|[src/lib/queue/processors/sync-ragflow.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/queue/processors/sync-ragflow.ts)|RAGFlow 同步处理器，支持消息和评论|
|[src/lib/queue/processors/auto-tag-extended.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/queue/processors/auto-tag-extended.ts)|扩展的自动打标签功能|

## 🎨 前端组件文件

|文件|说明|
|---|---|
|[src/components/WorkspaceManager.tsx](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/components/WorkspaceManager.tsx)|工作区管理 UI（创建/编辑/删除/初始化 RAGFlow）|
|[src/components/AIConfigForm.tsx](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/components/AIConfigForm.tsx)|AI 配置表单组件|

## 🔌 API 客户端文件

|文件|说明|
|---|---|
|[src/lib/api/workspaces.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/api/workspaces.ts)|Workspace API 客户端封装|

## 🧠 知识库管理文件

|文件|说明|
|---|---|
|[src/lib/knowledge-base.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/knowledge-base.ts)|统一的知识库同步工具|

## 🔄 其他集成文件

|文件|说明|
|---|---|
|[src/lib/sync-utils.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/sync-utils.ts)|同步工具函数|
|[src/lib/utils/ai-detection.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/utils/ai-detection.ts)|AI 检测工具|
|[src/types/api.ts](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/types/api.ts)|Workspace 类型定义|

## 📚 RAGFlow API 脚本文件

|文件|说明|
|---|---|
|[HttpAPIRAGFlow/createRAGFlow.js](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/HttpAPIRAGFlow/createRAGFlow.js)|RAGFlow 资源创建脚本|
|[HttpAPIRAGFlow/README.md](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/HttpAPIRAGFlow/README.md)|详细的 API 文档|

---

**架构核心流程**：

1. 创建 Workspace → 调用 [`provisionRAGFlowForWorkspace`](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ragflow/provision.ts) → 自动创建 Dataset + Chat
2. 发送消息 → 加入队列 → [`auto-tag`](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/queue/processors/auto-tag.ts) → [`sync-ragflow`](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/queue/processors/sync-ragflow.ts) → 同步到该 Workspace 的 Dataset
3. AI 聊天 → 使用 Workspace 的 [`ragflowChatId`](vscode-webview://0kgl1aoms3v1vb68ae0d1b47go1p21tq8n6eptfcc946s48prfo6/src/lib/ai/ragflow.ts) 调用 RAGFlow API