# RAG 引用卡片功能实现总结

## 📋 功能概述

当用户在 WhiteNote 中使用 `@goldierill` 提问时，如果启用了 RAG 模式，AI 回复的评论会自动显示一个**引用卡片**（类似 X/Twitter 的引用转发效果），展示被引用的原始消息。

### 效果展示

```
用户帖子
├── AI 评论回复
│   ├── AI 回复内容
│   └── 🔽 引用卡片（灰色边框、圆角、悬停效果）
│       ├── 原帖作者头像、用户名
│       ├── 发布时间
│       └── 原帖内容预览（截断2行）
```

---

## 🛠️ 技术实现

### 数据库设计

#### Comment 模型修改
```prisma
model Comment {
  id              String   @id @default(cuid())
  content         String
  createdAt       DateTime @default(now())
  isAIBot         Boolean  @default(false)
  messageId       String
  authorId        String?
  parentId        String?
  quotedMessageId String?  // 新增：引用的消息 ID
  author          User?    @relation(fields: [authorId], references: [id])
  message         Message  @relation(fields: [messageId], references: [id])
  parent          Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies         Comment[] @relation("CommentReplies")
  quotedMessage   Message? @relation("QuoteComment", fields: [quotedMessageId], references: [id])
  retweets        Retweet[]

  @@index([messageId, createdAt])
  @@index([quotedMessageId])  // 新增索引
}
```

#### Message 模型修改
```prisma
model Message {
  // ... 其他字段
  quotedMessage   Message?   @relation("QuoteRetweet", fields: [quotedMessageId], references: [id])
  quoteRetweets   Message[]  @relation("QuoteRetweet")
  quoteComments   Comment[]  @relation("QuoteComment")  // 新增
  // ... 其他字段
}
```

### API 修改

#### 1. AI Chat API (`src/app/api/ai/chat/route.ts`)

**功能**：从 RAGFlow 返回的引用数据中提取消息 ID，并保存到评论

**核心逻辑**：
```typescript
// 从 RAGFlow 文档名称提取消息 ID
function extractMessageIdFromDocument(documentName: string): string | null {
  const match = documentName.match(/message_([a-z0-9]+)\.md$/i)
  return match ? match[1] : null
}

// RAG 模式处理
if (config.enableRag && config.ragflowApiKey && config.ragflowChatId) {
  const result = await callRAGFlow(session.user.id, messages)
  aiResponse = result.content
  references = result.references

  // 提取第一个引用的 messageId
  if (references && references.length > 0) {
    quotedMessageId = extractMessageIdFromDocument(references[0].source) || undefined
  }
}

// 清理 [ID:0] 标记
const cleanedResponse = aiResponse.replace(/\[ID:\d+\]/g, '').trim()

// 保存评论（包含引用）
const comment = await prisma.comment.create({
  data: {
    content: cleanedResponse,
    messageId,
    isAIBot: true,
    quotedMessageId,
  },
  include: {
    quotedMessage: true,
  },
})
```

#### 2. RAGFlow 接口适配 (`src/lib/ai/ragflow.ts`)

**问题**：RAGFlow 返回的 `reference` 是数组，不是对象

**解决方案**：
```typescript
interface RAGFlowResponse {
  choices: Array<{
    message: {
      content: string
      reference?: Array<{  // 数组，不是对象！
        content: string
        document_name: string
        similarity: number
      }>
    }
  }>
}

// 提取引用
const references = message?.reference
  ? message.reference.map((ref) => ({
      content: ref.content,
      source: ref.document_name,
    }))
  : undefined
```

#### 3. 评论 APIs（返回引用数据）

**修改的接口**：
- `GET /api/messages/[id]/comments` - 获取消息的评论列表
- `GET /api/comments/[id]` - 获取单个评论详情
- `GET /api/comments/[id]/children` - 获取子评论列表

**统一添加**：
```typescript
include: {
  author: { select: { id: true, name: true, avatar: true, email: true } },
  quotedMessage: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, name: true, avatar: true, email: true }
      }
    }
  },
  // ...
}
```

### 前端组件修改

#### 1. QuotedMessageCard 组件

**文件**：`src/components/QuotedMessageCard.tsx`

**功能**：显示引用的消息卡片（可复用）

**特性**：
- 显示原帖作者头像、用户名、@handle
- 显示发布时间
- 内容截断2行（line-clamp-2）
- 灰色边框、圆角、悬停效果
- 点击可跳转到原帖

#### 2. CommentsList 组件

**文件**：`src/components/CommentsList.tsx`

**修改**：在评论内容下方添加引用卡片

```tsx
<div className="mt-1 text-sm leading-normal wrap-break-word">
  <TipTapViewer content={comment.content} />
</div>

{/* 引用的消息卡片 - 类似 X/Twitter */}
{comment.quotedMessage && (
  <QuotedMessageCard
    message={comment.quotedMessage}
    className="mt-2"
  />
)}
```

#### 3. 评论详情页

**文件**：`src/app/status/[id]/comment/[commentId]/page.tsx`

**修改**：主评论和子评论都添加引用卡片显示

#### 4. 帖子详情页

**文件**：`src/app/status/[id]/page.tsx`

**修改**：支持显示消息本身的引用（转推情况）

### 类型定义

**文件**：`src/types/api.ts`

**新增**：
```typescript
// 引用的消息（简化版）
export interface QuotedMessage {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    avatar: string | null
    email: string | null
  } | null
}

export interface Comment {
  // ... 其他字段
  quotedMessageId?: string | null
  quotedMessage?: QuotedMessage | null
}
```

---

## 📂 修改的文件列表

### 数据库
- [prisma/schema.prisma](prisma/schema.prisma)
  - Comment 模型添加 `quotedMessageId` 字段
  - Comment 模型添加 `quotedMessage` 关联
  - Message 模型添加 `quoteComments` 反向关联

### 后端 API
- [src/app/api/ai/chat/route.ts](src/app/api/ai/chat/route.ts)
  - 添加引用提取逻辑
  - 添加 `[ID:0]` 标记清理
  - 保存时包含 `quotedMessageId`

- [src/lib/ai/ragflow.ts](src/lib/ai/ragflow.ts)
  - 修复 RAGFlow 响应解析（数组 vs 对象）
  - 正确提取引用数据

- [src/app/api/messages/[id]/comments/route.ts](src/app/api/messages/[id]/comments/route.ts)
  - 返回 `quotedMessage` 数据

- [src/app/api/comments/[id]/route.ts](src/app/api/comments/[id]/route.ts)
  - GET/PATCH 都返回 `quotedMessage` 数据

- [src/app/api/comments/[id]/children/route.ts](src/app/api/comments/[id]/children/route.ts)
  - 返回 `quotedMessage` 数据

- [src/app/api/messages/[id]/route.ts](src/app/api/messages/[id]/route.ts)
  - GET/PUT 都返回 `quotedMessage` 数据

### 前端组件
- [src/components/QuotedMessageCard.tsx](src/components/QuotedMessageCard.tsx)
  - 复用现有组件（无需修改）

- [src/components/CommentsList.tsx](src/components/CommentsList.tsx)
  - 添加引用卡片显示

- [src/app/status/[id]/comment/[commentId]/page.tsx](src/app/status/[id]/comment/[commentId]/page.tsx)
  - 主评论和子评论都显示引用卡片

- [src/app/status/[id]/page.tsx](src/app/status/[id]/page.tsx)
  - 显示消息的引用卡片

### 类型定义
- [src/types/api.ts](src/types/api.ts)
  - 添加 `QuotedMessage` 接口
  - `Comment` 接口添加引用字段

---

## 🎯 使用方法

### 前置条件

1. **启用 RAG 模式**
   - 访问 http://localhost:3005/settings/ai
   - 启用 "启用 RAG 模式"
   - 配置 RAGFlow API Key、Chat ID、Dataset ID

2. **同步消息到 RAGFlow**
   - 消息会自动同步到 RAGFlow 知识库
   - 包括标签信息（格式：`#标签1  #标签2  #标签3`）

### 使用流程

1. **发布消息**
   ```
   华尔街日报报道了青少年炒股趋势...
   ```

2. **在评论区 @goldierill 提问**
   ```
   @goldierill 这条消息讲了什么？
   ```

3. **AI 自动回复**
   - AI 分析消息内容
   - 返回回复并显示引用卡片
   - 引用卡片显示原帖信息（头像、用户名、时间、内容预览）

4. **点击引用卡片**
   - 跳转到原帖详情页

---

## 🔧 故障排查

### 问题 1：引用卡片不显示

**可能原因**：
- RAGFlow 没有返回引用数据
- RAG 模式未启用
- 消息未同步到 RAGFlow

**解决方法**：
1. 检查设置页面是否启用了 RAG 模式
2. 检查 RAGFlow API 配置是否正确
3. 查看 Worker 日志，确认消息已同步到 RAGFlow
4. 查看终端日志，确认 `quotedMessageId` 被正确提取

### 问题 2：AI 回复中包含 [ID:0] 标记

**已修复**：代码会自动清理 `[ID:数字]` 格式的标记

### 问题 3：数据库迁移失败

**解决方法**：
```bash
# 如果遇到 drift 错误
npx prisma db push

# 或者重置数据库（会丢失数据）
npx prisma migrate reset
```

### 问题 4：TypeScript 类型错误

**解决方法**：
```bash
# 重新生成 Prisma Client
npx prisma generate

# 重启 TypeScript 服务器（VSCode）
Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

---

## 🎨 样式效果

### 引用卡片样式

- **边框**：`border border-border` (灰色边框)
- **圆角**：`rounded-2xl` (大圆角)
- **内边距**：`p-3`
- **悬停效果**：`hover:bg-muted/30 transition-colors`
- **内容截断**：`line-clamp-2` (最多显示2行)
- **可点击**：整个卡片可点击，跳转到原帖

### 布局位置

- 在评论内容下方
- 与评论内容间隔 `mt-2` (8px)
- 在操作行之前

---

## 🚀 未来优化方向

1. **多引用支持**
   - 当前只显示第一个引用（最相关的）
   - 可扩展为显示多个引用

2. **引用相似度显示**
   - 显示引用的相似度分数
   - 用不同颜色/样式区分相关性

3. **引用展开/收起**
   - 引用卡片可展开查看完整内容
   - 折叠时只显示关键信息

4. **引用来源标识**
   - 显示 "引用自" 标识
   - 区分是 RAG 引用还是手动引用

---

## 📝 开发笔记

### 关键发现

1. **RAGFlow API 响应格式**
   - `reference` 是**数组**，不是对象
   - 文档名称格式：`message_{messageId}.md`

2. **数据关联策略**
   - Comment 直接引用 Message（复用 Message 的引用机制）
   - 通过外键 `quotedMessageId` 关联
   - 联查时使用 `include` 自动加载引用数据

3. **内容清理**
   - RAGFlow 可能返回 `[ID:0]` 标记
   - 使用正则 `/\[ID:\d+\]/g` 清理

4. **组件复用**
   - `QuotedMessageCard` 可同时用于：
     - Message 的引用（转推）
     - Comment 的引用（AI RAG 引用）

---

## ✅ 测试验证

### 测试步骤

1. ✅ 数据库迁移成功
2. ✅ Prisma Client 重新生成
3. ✅ AI Chat API 正确提取 `quotedMessageId`
4. ✅ 评论 API 返回 `quotedMessage` 数据
5. ✅ CommentsList 组件显示引用卡片
6. ✅ 评论详情页显示引用卡片
7. ✅ 帖子详情页显示引用卡片
8. ✅ `[ID:0]` 标记被正确清理
9. ✅ 引用卡片样式符合设计要求
10. ✅ 点击引用卡片可跳转到原帖

### 测试环境

- **数据库**：PostgreSQL
- **ORM**：Prisma
- **框架**：Next.js 15
- **UI**：React + Tailwind CSS
- **RAGFlow**：v0.14.1

---

## 📞 联系与支持

如有问题或建议，请在项目仓库提交 Issue。
