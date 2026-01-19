# Markdown 双向同步功能实现计划

## 📋 文档概述

本文档详细说明了如何在现有的 WhiteNote MD 同步系统基础上，实现完整的双向同步功能，特别是**本地新建文件自动创建帖子**的功能。

**当前状态**：已实现数据库 → 本地的单向同步（修改同步）
**目标状态**：实现完整的双向同步（新建 + 修改 + 删除）

---

## 🎯 核心需求

### 用户期望的行为

1. **新建本地文件 → 创建新帖子**
   - 在 `{SYNC_DIR}/{workspaceId}/` 目录下创建 `message_new-idea.md`
   - 系统自动在数据库中创建新的 Message
   - 文件重命名为 `message_{generated-id}.md`

2. **新建本地文件 → 创建新评论**
   - 在 `{SYNC_DIR}/{workspaceId}/` 目录下创建 `comment_msg1-reply.md`
   - 系统自动创建评论并关联到指定消息
   - 文件重命名为 `comment_{generated-id}.md`

3. **删除本地文件 → 删除数据库记录**
   - 删除 `message_xxx.md` → 删除数据库中的 Message
   - 删除 `comment_xxx.md` → 删除数据库中的 Comment

---

## 📂 当前实现分析

### 已实现的功能

✅ **数据库 → 本地导出**（按 Workspace 分组）
- 文件路径：`src/lib/sync-utils.ts` - `exportToLocal()`
- 队列处理：`src/lib/queue/processors/sync-to-local.ts`
- 支持消息和评论导出
- workspace.json 元数据管理

✅ **本地文件修改 → 数据库更新**
- 文件监控：`src/lib/socket/server.ts` - chokidar 监听 `change` 事件
- 导入逻辑：`src/lib/sync-utils.ts` - `importFromLocal()`
- 标签双向同步
- RAGFlow 自动同步触发

✅ **按 Workspace 分组的文件结构**
```
D:\Code\whitenote-data\link_md\
├── workspace-abc123\
│   ├── .whitenote\
│   │   └── workspace.json
│   ├── message_msg1.md
│   └── comment_cmt1.md
└── workspace-def456\
    ├── .whitenote\
    │   └── workspace.json
    └── message_msg3.md
```

### 缺失的功能

❌ **新建文件处理**
- 文件监控器未监听 `add` 事件
- 没有新建文件 → 创建数据库记录的逻辑

❌ **删除文件处理**
- 文件监控器未监听 `unlink` 事件
- 没有删除文件 → 删除数据库记录的逻辑

❌ **文件命名规范**
- 新建文件时用户需要知道如何命名
- 需要设计简洁的临时命名规则

---

## 🔧 文件命名规范设计

### 方案 A：前缀 + 临时标识符（推荐）

**新建消息文件：**
```
message_new-{slug}.md
message_new-my-idea.md
message_new-todo-list.md
```

**新建评论文件：**
```
comment_{messageId}-new-{slug}.md
comment_msg1-new-reply.md
comment_msg1-new-thought.md
```

**处理流程：**
1. 用户创建 `message_new-idea.md`
2. 系统检测到 `new-{slug}` 模式
3. 创建数据库记录，生成真实 ID
4. 重命名文件为 `message_{generated-id}.md`
5. 更新 workspace.json

### 方案 B：UUID 临时文件名（备选）

```
message_{uuid}.md
comment_{messageId}_{uuid}.md
```

优点：无需重命名，但用户友好性差。

---

## 🏗️ 技术架构设计

### 文件监控事件处理

| 事件 | 当前状态 | 需要实现 | 处理逻辑 |
|------|----------|----------|----------|
| `add` | ❌ 未监听 | ✅ 新建处理器 | 检测文件名模式 → 创建 DB 记录 → 重命名文件 |
| `change` | ✅ 已实现 | 保持现有 | 更新 DB 记录 → 同步 RAGFlow |
| `unlink` | ❌ 未监听 | ✅ 删除处理器 | 删除 DB 记录 → 更新 workspace.json |

### 处理流程图

```
用户创建文件
    ↓
chokidar 检测到 'add' 事件
    ↓
提取 workspaceId 和 fileName
    ↓
解析文件名模式：
    ├─ message_new-{slug}.md  → 创建新 Message
    ├─ comment_{msgId}-new-{slug}.md → 创建新 Comment
    └─ message_{id}.md/comment_{id}.md → 更新现有记录
    ↓
创建数据库记录
    ↓
重命名文件为真实 ID
    ↓
更新 workspace.json
    ↓
触发后续任务（auto-tag, RAGFlow 同步）
```

---

## 📝 需要修改的文件清单

### 1. 核心同步工具扩展

**文件：`src/lib/sync-utils.ts`**

**新增函数：**

```typescript
/**
 * 检查文件名是否为新建文件
 */
export function isNewFilePattern(fileName: string): {
  isNew: boolean
  type: 'message' | 'comment' | null
  slug?: string
  messageId?: string
}

/**
 * 处理新建文件 → 创建数据库记录
 */
export async function handleNewFile(
  workspaceId: string,
  fileName: string
): Promise<{ success: boolean; newId?: string; error?: string }>

/**
 * 处理删除文件 → 删除数据库记录
 */
export async function handleDeletedFile(
  workspaceId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }>

/**
 * 重命名文件（从临时名到真实 ID）
 */
export async function renameFile(
  workspaceId: string,
  oldFileName: string,
  newFileName: string
): Promise<boolean>
```

### 2. 文件监控器增强

**文件：`src/lib/socket/server.ts`**

**修改内容：**

```typescript
// 当前：只监听 change 事件
watcher.on('change', async (filePath) => { ... })

// 新增：监听 add 和 unlink 事件
watcher.on('add', async (filePath) => {
  // 新建文件处理
  await handleNewFile(workspaceId, fileName)
})

watcher.on('unlink', async (filePath) => {
  // 删除文件处理
  await handleDeletedFile(workspaceId, fileName)
})
```

### 3. 数据库操作函数

**新建：`src/lib/db/create-from-local.ts`**

```typescript
/**
 * 从本地文件创建 Message
 */
export async function createMessageFromLocalFile(params: {
  workspaceId: string
  userId: string
  content: string
  tags: string[]
  title?: string
}): Promise<string>

/**
 * 从本地文件创建 Comment
 */
export async function createCommentFromLocalFile(params: {
  messageId: string
  userId: string
  content: string
  tags: string[]
}): Promise<string>

/**
 * 删除 Message（及其关联）
 */
export async function deleteMessageFromLocal(messageId: string): Promise<boolean>

/**
 * 删除 Comment（及其关联）
 */
export async function deleteCommentFromLocal(commentId: string): Promise<boolean>
```

### 4. 用户识别机制

**问题：** 本地文件创建时如何知道属于哪个用户？

**解决方案：**

1. **方案 A：workspace.json 存储用户信息**
```json
{
  "workspace": {
    "id": "workspace-abc123",
    "userId": "user-xyz789",
    "name": "My Workspace"
  }
}
```

2. **方案 B：通过 Workspace 查询用户**
```typescript
const workspace = await prisma.workspace.findUnique({
  where: { id: workspaceId },
  select: { userId: true }
})
```

**推荐：方案 B**（保持数据一致性）

---

## 🔍 关键技术细节

### 1. 文件名模式识别

**正则表达式：**

```typescript
// 新建消息：message_new-{slug}.md
const NEW_MESSAGE_PATTERN = /^message_new-(.+)\.md$/i

// 新建评论：comment_{messageId}-new-{slug}.md
const NEW_COMMENT_PATTERN = /^comment_([a-z0-9]+)-new-(.+)\.md$/i

// 现有文件：message_{id}.md 或 comment_{id}.md
const EXISTING_FILE_PATTERN = /^(message|comment)_([a-z0-9]+)\.md$/i
```

**识别逻辑：**

```typescript
function isNewFilePattern(fileName: string) {
  // 1. 检查是否为新建消息
  const messageMatch = fileName.match(NEW_MESSAGE_PATTERN)
  if (messageMatch) {
    return {
      isNew: true,
      type: 'message',
      slug: messageMatch[1]
    }
  }

  // 2. 检查是否为新建评论
  const commentMatch = fileName.match(NEW_COMMENT_PATTERN)
  if (commentMatch) {
    return {
      isNew: true,
      type: 'comment',
      messageId: commentMatch[1],
      slug: commentMatch[2]
    }
  }

  // 3. 现有文件
  return { isNew: false, type: null }
}
```

### 2. 文件重命名原子性

**问题：** 重命名过程中断可能导致文件丢失

**解决方案：**

```typescript
// 使用原子重命名操作
import * as fs from 'fs'
import * as path from 'path'

async function renameFile(
  workspaceId: string,
  oldFileName: string,
  newFileName: string
): Promise<boolean> {
  const workspaceDir = getWorkspaceDir(workspaceId)
  const oldPath = path.join(workspaceDir, oldFileName)
  const newPath = path.join(workspaceDir, newFileName)

  try {
    // 使用 fs.renameSync（原子操作）
    fs.renameSync(oldPath, newPath)
    return true
  } catch (error) {
    console.error(`[SyncUtils] Failed to rename ${oldFileName} to ${newFileName}:`, error)
    return false
  }
}
```

### 3. 删除操作权限验证

**关键：** 防止误删其他用户的数据

```typescript
async function handleDeletedFile(workspaceId: string, fileName: string) {
  const ws = getWorkspaceData(workspaceId)
  const meta = ws.files[fileName.replace('.md', '')]

  if (!meta) {
    console.log(`[SyncUtils] Unknown file ${fileName}, skipping deletion`)
    return { success: false, error: 'File not in workspace.json' }
  }

  // 验证记录属于当前 workspace 的用户
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true }
  })

  if (meta.type === 'message') {
    const message = await prisma.message.findUnique({
      where: { id: meta.id },
      select: { authorId: true }
    })

    // 只删除作者自己的消息
    if (message?.authorId !== workspace?.userId) {
      return { success: false, error: 'Permission denied' }
    }

    await deleteMessageFromLocal(meta.id)
  }

  // ... Comment 同理

  return { success: true }
}
```

### 4. 队列集成

**新建文件 → 自动触发后续任务：**

```typescript
// 在 handleNewFile 中创建记录后
if (newId) {
  // 1. 添加到队列进行自动打标签
  await addTask("auto-tag", {
    userId: workspace.userId,
    workspaceId: workspaceId,
    messageId: newId,
    contentType: type // 'message' or 'comment'
  })

  // 2. auto-tag 完成后会自动触发 sync-ragflow
  // (参考现有的 auto-tag.ts 处理器)
}
```

---

## 📤 用户指南文档

需要在设置页面添加使用说明：

### 如何在本地创建新帖子

**方式 1：创建新消息**
```
1. 在 D:\Code\whitenote-data\link_md\{workspaceId}\ 目录下
2. 创建新文件：message_new-我的想法.md
3. 文件内容格式：
   #标签1 #标签2

   这是消息正文内容...
4. 保存文件，系统会自动：
   - 创建数据库记录
   - 重命名文件为 message_{真实ID}.md
   - 自动打标签
   - 同步到 RAGFlow
```

**方式 2：创建新评论**
```
1. 在 D:\Code\whitenote-data\link_md\{workspaceId}\ 目录下
2. 创建新文件：comment_msg1-new-回复.md
   （msg1 是你要评论的消息 ID）
3. 文件内容格式：
   #标签1 #标签2

   这是评论内容...
4. 保存文件，系统会自动创建评论
```

**删除帖子**
```
直接删除 message_xxx.md 或 comment_xxx.md 文件
系统会自动删除数据库中的记录
```

---

## 🧪 测试计划

### 单元测试

**文件：`src/lib/sync-utils/__tests__/pattern.test.ts`**

```typescript
describe('File Name Pattern Detection', () => {
  test('should detect new message pattern', () => {
    const result = isNewFilePattern('message_new-my-idea.md')
    expect(result).toEqual({
      isNew: true,
      type: 'message',
      slug: 'my-idea'
    })
  })

  test('should detect new comment pattern', () => {
    const result = isNewFilePattern('comment_msg1-new-reply.md')
    expect(result).toEqual({
      isNew: true,
      type: 'comment',
      messageId: 'msg1',
      slug: 'reply'
    })
  })

  test('should reject existing files', () => {
    const result = isNewFilePattern('message_abc123.md')
    expect(result.isNew).toBe(false)
  })
})
```

### 集成测试场景

1. **场景 1：新建消息**
   - 创建 `message_new-test.md`
   - 验证数据库中有新记录
   - 验证文件已重命名
   - 验证 workspace.json 已更新

2. **场景 2：新建评论**
   - 创建 `comment_msg1-new-reply.md`
   - 验证评论已创建并关联到 msg1
   - 验证文件已重命名

3. **场景 3：删除文件**
   - 删除 `message_xxx.md`
   - 验证数据库记录已删除
   - 验证 workspace.json 已更新

4. **场景 4：冲突处理**
   - 同时修改文件和数据库记录
   - 验证最终一致性

---

## ⚠️ 潜在问题和解决方案

### 问题 1：重命名冲突

**场景：** 用户创建 `message_new-idea.md`，但在重命名前文件被修改

**解决方案：**
- 使用文件锁或队列序列化操作
- 检测目标文件名是否已存在
- 添加冲突重试机制

### 问题 2：Workspace 不存在

**场景：** 用户在未同步的 workspace 目录下创建文件

**解决方案：**
```typescript
// 验证 workspace 存在
const workspace = await prisma.workspace.findUnique({
  where: { id: workspaceId }
})

if (!workspace) {
  console.error(`[SyncUtils] Workspace ${workspaceId} not found`)
  return { success: false, error: 'Workspace not found' }
}
```

### 问题 3：用户权限验证

**场景：** 多用户系统，确保用户只能在自己的数据范围内操作

**解决方案：**
- 通过 Workspace 查询 userId
- 所有数据库操作验证 authorId
- 删除操作二次验证权限

### 问题 4：文件监控失效

**场景：** chokidar 监控失效（网络驱动器、权限问题）

**解决方案：**
- 添加健康检查机制
- 定期扫描文件系统
- 提供手动同步按钮作为后备

---

## 📅 实施步骤

### Phase 1：核心功能实现（优先级：高）

1. **扩展 sync-utils.ts**
   - [ ] 实现 `isNewFilePattern()`
   - [ ] 实现 `handleNewFile()`
   - [ ] 实现 `handleDeletedFile()`
   - [ ] 实现 `renameFile()`

2. **创建数据库操作模块**
   - [ ] 创建 `src/lib/db/create-from-local.ts`
   - [ ] 实现 `createMessageFromLocalFile()`
   - [ ] 实现 `createCommentFromLocalFile()`
   - [ ] 实现 `deleteMessageFromLocal()`
   - [ ] 实现 `deleteCommentFromLocal()`

3. **增强文件监控器**
   - [ ] 修改 `src/lib/socket/server.ts`
   - [ ] 添加 `add` 事件监听
   - [ ] 添加 `unlink` 事件监听
   - [ ] 集成新的事件处理器

### Phase 2：集成测试和优化（优先级：中）

4. **Workspace 扩展**
   - [ ] 修改 `getWorkspaceData()` 返回 userId
   - [ ] 更新 workspace.json 结构
   - [ ] 迁移现有数据

5. **队列集成**
   - [ ] 新建文件后触发 auto-tag
   - [ ] 确保 RAGFlow 同步正常

6. **错误处理**
   - [ ] 添加重试机制
   - [ ] 完善日志记录
   - [ ] 用户友好的错误提示

### Phase 3：用户体验优化（优先级：低）

7. **UI 改进**
   - [ ] 添加文件创建状态提示
   - [ ] 显示同步进度
   - [ ] 错误提示优化

8. **文档完善**
   - [ ] 用户使用指南
   - [ ] API 文档更新
   - [ ] 故障排查指南

---

## 📊 预期成果

### 功能完整性

✅ 用户可以通过创建本地 MD 文件来发布帖子
✅ 本地文件修改自动同步到数据库
✅ 本地文件删除自动删除数据库记录
✅ 支持 Message 和 Comment 两种类型
✅ 按 Workspace 完全隔离
✅ 自动触发 AI 打标签和 RAGFlow 同步

### 用户体验

📝 **简单**：只需要创建文件，系统自动处理其余工作
🔄 **实时**：文件变化几秒内同步到数据库
🛡️ **安全**：权限验证确保数据安全
📂 **清晰**：文件命名规范直观易懂

---

## 🔗 相关文档

- [MD_SYNC_PLAN.md](./MD_SYNC_PLAN.md) - 原始 MD 同步计划
- [WORKSPACEIMPLEMENTATIONGUIDE.md](./WORKSPACEIMPLEMENTATIONGUIDE.md) - Workspace 实现指南
- [HttpAPIRAGFlow/README.md](../HttpAPIRAGFlow/README.md) - RAGFlow API 参考

---

**文档版本：** 1.0
**最后更新：** 2025-01-19
**状态：** 待实施
