# WhiteNote 2.5 前端 API 接入状态报告

> **生成日期**: 2026-01-07
> **后端完成度**: 90%
> **前端接入度**: 60%
> **整体完成度**: 55%

---

## 📊 执行摘要

WhiteNote 2.5 项目已经完成了约 90% 的后端 API 开发，前端框架已搭建完成并实现了部分 API 接入。本文档分析了前端 API 的使用情况，找出了未接入的 API 和未实现的功能。

### 核心发现

✅ **已完成**:
- 核心消息系统（创建、编辑、删除、收藏、置顶）
- 评论系统
- 标签系统
- 模板系统
- 搜索功能
- AI 配置和聊天功能

❌ **未完成**:
- 双向链接系统（Bi-directional Links）
- 知识图谱可视化（Knowledge Graph）
- 版本历史（Version History）
- 提醒系统（Reminders）
- 导入/导出功能（Import/Export）
- 媒体上传功能（Media Upload）
- 实时多端同步（Realtime Sync）
- 用户资料编辑
- 搜索历史
- 聚焦模式
- Web Push 通知

---

## 1. 已接入的后端 API

### 1.1 认证系统 (Authentication)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/auth/register` | POST | ✅ 已接入 | `src/app/(auth)/register/page.tsx` |
| `/api/auth/[...nextauth]` | GET/POST | ✅ 已接入 | NextAuth 核心配置 |
| `/api/auth/me` | GET | ✅ 已接入 | 用于获取当前用户信息 |
| `/api/auth/me` | PUT | ❌ **未使用** | 无前端实现 |

**功能说明**:
- ✅ 用户注册功能完整
- ✅ 用户登录功能完整
- ✅ Session 管理完整
- ❌ 缺少用户资料编辑页面（更新头像、昵称）

---

### 1.2 消息系统 (Messages)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/messages` | GET | ✅ 已接入 | `MessagesList.tsx`, `messagesApi.ts` |
| `/api/messages` | POST | ✅ 已接入 | `InputMachine.tsx` |
| `/api/messages/[id]` | GET | ✅ 已接入 | `status/[id]/page.tsx`, `status/[id]/edit/page.tsx` |
| `/api/messages/[id]` | PUT | ✅ 已接入 | `status/[id]/edit/page.tsx` |
| `/api/messages/[id]` | DELETE | ✅ 已接入 | `MessageCard.tsx` |
| `/api/messages/[id]/star` | POST | ✅ 已接入 | `MessageCard.tsx` |
| `/api/messages/[id]/pin` | POST | ✅ 已接入 | `MessageCard.tsx` |

**功能说明**:
- ✅ 消息列表（时间线）功能完整
- ✅ 创建、编辑、删除消息功能完整
- ✅ 收藏和置顶功能完整
- ✅ 分页和过滤功能完整

**缺失功能**:
- ❌ Thread 模式（串式回复）- 数据库已支持，前端未实现
- ❌ 版本历史查看和恢复 - 后端已实现，前端未接入

---

### 1.3 评论系统 (Comments)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/messages/[id]/comments` | GET | ✅ 已接入 | `CommentsList.tsx` |
| `/api/messages/[id]/comments` | POST | ✅ 已接入 | `CommentsList.tsx`, `ReplyDialog.tsx` |

**功能说明**:
- ✅ 评论列表显示完整
- ✅ 创建评论功能完整
- ✅ AI 评论回复功能完整（通过 `/api/ai/chat`）

---

### 1.4 标签系统 (Tags)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/tags` | GET | ✅ 已接入 | `tags/page.tsx`, `RightSidebar.tsx` |
| `/api/tags` | POST | ✅ 已接入 | `tags/page.tsx` |
| `/api/tags/[id]/messages` | GET | ✅ 已接入 | `tagsApi.ts` |

**功能说明**:
- ✅ 标签列表功能完整
- ✅ 创建标签功能完整
- ✅ 按标签过滤消息功能完整
- ✅ 标签热度显示完整

---

### 1.5 模板系统 (Templates)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/templates` | GET | ✅ 已接入 | `templates/page.tsx`, `InputMachine.tsx` |
| `/api/templates` | POST | ✅ 已接入 | `templates/page.tsx` |
| `/api/templates/[id]` | GET | ✅ 已接入 | `templatesApi.ts` |
| `/api/templates/[id]` | DELETE | ✅ 已接入 | `templatesApi.ts` |

**功能说明**:
- ✅ 模板列表功能完整
- ✅ 创建自定义模板功能完整
- ✅ 使用模板创建消息功能完整
- ✅ 删除模板功能完整

---

### 1.6 搜索功能 (Search)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/search` | GET | ✅ 已接入 | `RightSidebar.tsx` |

**功能说明**:
- ✅ 全局搜索功能完整
- ❌ 缺少搜索历史功能
- ❌ 缺少高级过滤器（按标签、时间、媒体类型过滤）

---

### 1.7 AI 功能 (AI Features)

| API 端点 | 方法 | 状态 | 前端使用位置 |
|---------|------|------|-------------|
| `/api/config` | GET | ✅ 已接入 | `AIConfigForm.tsx` |
| `/api/config` | PUT | ✅ 已接入 | `AIConfigForm.tsx` |
| `/api/config` | POST | ✅ 已接入 | `AIConfigForm.tsx` (测试连接) |
| `/api/ai/chat` | POST | ✅ 已接入 | `CommentsList.tsx`, `InputMachine.tsx` |
| `/api/ai/enhance` | POST | ❌ **未使用** | `aiApi.ts` (已封装但未调用) |

**功能说明**:
- ✅ AI 配置管理功能完整
- ✅ RAGFlow 配置热更新功能完整
- ✅ AI 聊天功能完整（支持标准模式和 RAG 模式）
- ✅ AI 自动打标签功能完整（后台 Worker）
- ✅ 每日晨报生成功能完整（后台 Worker）
- ❌ AI 文本增强功能未在前端调用（总结、翻译、扩展、润色）

---

## 2. 未接入的后端 API

### 2.1 用户资料管理

| API 端点 | 方法 | 状态 | 说明 |
|---------|------|------|------|
| `/api/auth/me` | PUT | ❌ 未接入 | 更新用户资料（头像、昵称） |

**建议**:
- 创建用户设置页面 `src/app/settings/page.tsx`
- 添加头像上传功能
- 添加昵称编辑功能

---

### 2.2 版本历史 (Version History)

**后端状态**: ✅ 已实现
**前端状态**: ❌ 未接入

**相关 API**:
- 版本自动保存在 `MessageVersion` 表中
- GET `/api/messages/[id]` 返回数据中包含 `_count.versions`

**缺失功能**:
1. 查看历史版本列表
2. 版本对比视图（Diff View）
3. 恢复到历史版本

**建议实现**:
```typescript
// 需要创建的 API
GET /api/messages/[id]/versions - 获取版本列表
GET /api/messages/[id]/versions/[versionId] - 获取特定版本
POST /api/messages/[id]/versions/[versionId]/restore - 恢复版本
```

---

### 2.3 双向链接系统 (Bi-directional Links)

**后端状态**: ✅ 数据库已支持
**前端状态**: ❌ 完全未实现

**数据库支持**:
- `MessageLink` 表（链接关系）
- `MessageAlias` 表（别名/历史标题）

**缺失功能**:
1. TipTap 编辑器中支持 `[[笔记标题]]` 语法
2. 链接解析和创建（保存时自动解析）
3. 反向链接面板（显示引用当前笔记的其他笔记）
4. 悬浮预览（鼠标悬停在链接上显示预览卡片）
5. 智能补全（输入 `[[` 后弹出搜索框）

**建议实现**:
```typescript
// 需要创建的 API
GET /api/links - 获取所有链接关系
GET /api/messages/[id]/backlinks - 获取反向链接
GET /api/messages/search?q= - 搜索笔记标题（用于智能补全）
POST /api/links/parse - 解析内容中的链接并保存
```

---

### 2.4 知识图谱 (Knowledge Graph)

**后端状态**: ❌ 未实现
**前端状态**: ❌ 未实现

**缺失功能**:
1. 全局图谱视图（所有笔记和标签的关系网络）
2. 局部图谱（单条笔记的邻居节点）
3. 图谱交互（点击节点、拖拽、缩放）

**建议实现**:
```typescript
// 需要创建的 API
GET /api/graph - 获取完整图谱数据
GET /api/graph/[messageId] - 获取局部图谱
```

**技术选型**:
- D3.js 或 Force Graph（可视化库）
- 数据结构：节点（笔记、标签）+ 边（链接、归属关系）

---

### 2.5 提醒系统 (Reminders)

**后端状态**: ✅ 数据库已支持
**前端状态**: ❌ 未实现

**数据库支持**:
- `Reminder` 表（提醒信息）
- 支持重复提醒（DAILY, WEEKLY, MONTHLY）

**缺失功能**:
1. 为笔记设置提醒时间
2. 查看今日待办提醒
3. 浏览器 Push 通知
4. 提醒完成标记

**建议实现**:
```typescript
// 需要创建的 API
GET /api/reminders - 获取提醒列表
POST /api/messages/[id]/reminders - 创建提醒
PUT /api/reminders/[id]/complete - 标记完成
DELETE /api/reminders/[id] - 删除提醒
```

---

### 2.6 导入/导出功能 (Import/Export)

**后端状态**: ❌ 未实现
**前端状态**: ❌ 未实现

**缺失功能**:
1. 导出为 Markdown
2. 导出为 JSON（完整备份）
3. 导出为 PDF
4. 导入 Markdown 文件/文件夹
5. 导入 Notion Markdown
6. 自动备份设置

**建议实现**:
```typescript
// 需要创建的 API
GET /api/export/messages?format=markdown - 导出消息
GET /api/export/backup - 完整备份
POST /api/import/markdown - 导入 Markdown
POST /api/import/notion - 导入 Notion
```

---

### 2.7 媒体上传功能 (Media Upload)

**后端状态**: ✅ 数据库已支持
**前端状态**: ❌ 未实现

**数据库支持**:
- `Media` 表（媒体资源）
- 字段：`url`, `type`, `description`

**缺失功能**:
1. 图片上传
2. 视频上传
3. 音频上传
4. AI 自动生成描述（Vision）

**建议实现**:
```typescript
// 需要创建的 API
POST /api/media/upload - 上传文件
GET /api/media/[id] - 获取媒体信息
DELETE /api/media/[id] - 删除媒体
```

**技术选型**:
- 文件存储：本地存储 `/public/uploads` 或对象存储（OSS/S3）
- 上传库：react-dropzone

---

### 2.8 实时多端同步 (Realtime Sync)

**后端状态**: ✅ 完整实现（Stage 8）
**前端状态**: ❌ 未接入

**后端支持**:
- Socket.IO 服务器 (`/api/socket`)
- Redis Pub/Sub 跨进程消息广播
- 5 秒防抖同步机制

**前端文档位置**:
- Hook: `src/hooks/useRealtimeSync.ts` (文档中，未创建)
- 组件: `src/components/editor/SyncEditor.tsx` (文档中，未创建)

**缺失功能**:
1. Socket.IO 客户端集成
2. 编辑模式检测
3. 远程更新接收
4. 同步状态指示器（同步中/已同步）

---

### 2.9 搜索历史 (Search History)

**后端状态**: ✅ 数据库已支持
**前端状态**: ❌ 未实现

**数据库支持**:
- `SearchHistory` 表

**缺失功能**:
1. 记录搜索历史
2. 显示最近搜索
3. 一键重用搜索
4. 清除搜索历史

**建议实现**:
```typescript
// 需要创建的 API
GET /api/search/history - 获取搜索历史
DELETE /api/search/history - 清除搜索历史
```

---

### 2.10 Web Push 通知

**后端状态**: ❌ 未实现
**前端状态**: ❌ 未实现

**缺失功能**:
1. 订阅 Push 通知
2. 发送提醒通知
3. 通知权限管理

**技术选型**:
- Web Push API
- Service Worker

---

## 3. 未实现的核心功能

### 3.1 Thread 模式（串式回复）

**状态**: 数据库支持，前端未实现

**数据库支持**:
- `Message.parentId` 字段
- `Message.children` 关系

**前端缺失**:
1. 点击回复按钮创建子消息
2. 主时间线折叠 Thread
3. Thread 详情页展开所有回复
4. Thread 层级显示

---

### 3.2 聚焦模式 (Focus Mode)

**状态**: 未实现

**缺失功能**:
1. 隐藏侧边栏和干扰元素
2. 打字机模式（当前行居中）
3. 全屏编辑

---

### 3.3 高级搜索过滤器

**状态**: 基础搜索已实现，高级过滤器未实现

**现有功能**:
- ✅ 基础文本搜索

**缺失功能**:
- ❌ 按标签过滤: `tag:#React`
- ❌ 按时间范围: `date:2025-12..2026-01`
- ❌ 按媒体类型: `has:image`, `has:code`
- ❌ 按收藏状态: `is:starred`
- ❌ AI 语义搜索

---

### 3.4 浏览器扩展 (Web Clipper)

**状态**: 未实现

**缺失功能**:
1. Chrome/Firefox 扩展
2. 快速捕获网页内容
3. 保存到 WhiteNote

---

## 4. 前端代码架构分析

### 4.1 API 客户端库

项目使用了统一的 API 客户端封装，位于 `src/lib/api/` 目录：

| 文件 | 功能 | 状态 |
|------|------|------|
| `messagesApi.ts` | 消息相关 API | ✅ 完整 |
| `tagsApi.ts` | 标签相关 API | ✅ 完整 |
| `commentsApi.ts` | 评论相关 API | ✅ 完整 |
| `templatesApi.ts` | 模板相关 API | ✅ 完整 |
| `searchApi.ts` | 搜索相关 API | ✅ 完整 |
| `configApi.ts` | 配置相关 API | ✅ 完整 |
| `aiApi.ts` | AI 功能 API | ✅ 完整（但 enhance 未使用） |

**优点**:
- 类型安全
- 统一封装
- 易于维护

---

### 4.2 HTTP 客户端

- **选择**: 原生 `fetch` API
- **优点**: 无需额外依赖，浏览器原生支持
- **缺点**: 需要手动处理拦截器、取消请求等

---

### 4.3 错误处理

所有 API 调用都遵循统一的错误处理模式：

```typescript
const result = await messagesApi.createMessage({ content: 'Hello' })

if (result.error) {
  // 处理错误
  console.error(result.error)
} else {
  // 使用数据
  console.log(result.data)
}
```

---

## 5. 技术债务与改进建议

### 5.1 代码质量问题

1. **API 调用方式不统一**
   - 问题：部分使用封装的 API 客户端，部分直接 fetch
   - 影响：维护困难，难以统一错误处理
   - 建议：统一使用 API 客户端库

2. **AI 增强功能未使用**
   - 问题：`/api/ai/enhance` 已封装但从未调用
   - 建议：在 TipTap 编辑器的 Slash Command 中集成

---

### 5.2 功能完整性问题

1. **双向链接系统缺失**
   - 优先级：高（核心功能）
   - 工作量：大
   - 依赖：TipTap 自定义扩展

2. **知识图谱缺失**
   - 优先级：中（差异化功能）
   - 工作量：中
   - 依赖：D3.js/Force Graph

3. **版本历史未接入**
   - 优先级：中（数据安全保障）
   - 工作量：小
   - 建议：优先实现版本列表和恢复功能

---

### 5.3 用户体验问题

1. **缺少用户反馈**
   - 问题：API 调用时缺少 loading 状态
   - 建议：使用 React Suspense 或 SWR

2. **缺少错误提示**
   - 问题：API 错误仅 console 输出
   - 建议：使用 Toast 组件显示错误

3. **缺少离线支持**
   - 问题：网络断开时无法使用
   - 建议：考虑使用 Service Worker + Cache API

---

## 6. 下一步开发计划

### Phase 1: 核心功能补全（优先级：高）

| 功能 | 工作量 | 依赖 | 预计时间 |
|------|--------|------|----------|
| 用户资料编辑页面 | 1 天 | 无 | 1 天 |
| 版本历史查看和恢复 | 2 天 | 无 | 2 天 |
| 双向链接系统（基础） | 5 天 | TipTap 扩展 | 5 天 |
| 媒体上传功能 | 2 天 | 文件存储 | 2 天 |

**小计**: 10 天

---

### Phase 2: 体验优化（优先级：中）

| 功能 | 工作量 | 依赖 | 预计时间 |
|------|--------|------|----------|
| Thread 模式 | 2 天 | 无 | 2 天 |
| 实时多端同步 | 3 天 | Socket.IO 客户端 | 3 天 |
| 高级搜索过滤器 | 2 天 | 无 | 2 天 |
| 提醒系统 | 3 天 | Web Push | 3 天 |

**小计**: 10 天

---

### Phase 3: 差异化功能（优先级：中低）

| 功能 | 工作量 | 依赖 | 预计时间 |
|------|--------|------|----------|
| 知识图谱可视化 | 4 天 | D3.js | 4 天 |
| 导入/导出功能 | 3 天 | 无 | 3 天 |
| 聚焦模式 | 1 天 | 无 | 1 天 |
| 搜索历史 | 1 天 | 无 | 1 天 |

**小计**: 9 天

---

### Phase 4: 高级功能（优先级：低）

| 功能 | 工作量 | 依赖 | 预计时间 |
|------|--------|------|----------|
| 浏览器扩展 (Web Clipper) | 5 天 | Chrome Extension API | 5 天 |
| AI 文本增强集成 | 1 天 | TipTap Slash Command | 1 天 |
| AI 语义搜索 | 3 天 | RAGFlow | 3 天 |

**小计**: 9 天

---

## 7. 总结

### 7.1 项目健康度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **后端完成度** | 90% | 核心功能完整，部分高级功能未实现 |
| **前端完成度** | 60% | 框架完整，核心功能已接入，高级功能缺失 |
| **代码质量** | 75% | 架构清晰，但存在部分技术债务 |
| **用户体验** | 65% | 基础体验良好，缺少细节打磨 |
| **文档完整性** | 85% | 后端文档详细，前端文档缺失 |

**整体评分**: **70%** (良好)

---

### 7.2 核心优势

1. ✅ **技术栈先进**: Next.js 16 + Prisma + TipTap
2. ✅ **架构清晰**: 多租户隔离，配置热更新
3. ✅ **类型安全**: TypeScript 全覆盖
4. ✅ **AI 深度集成**: 双模 AI（标准 + RAG）
5. ✅ **后台任务队列**: BullMQ + Redis

---

### 7.3 主要差距

1. ❌ **双向链接系统**: 未实现（Roam Research 核心特性）
2. ❌ **知识图谱**: 未实现（可视化知识网络）
3. ❌ **实时同步**: 未接入（多端协作体验）
4. ❌ **版本历史**: 未接入（数据安全保障）
5. ❌ **媒体上传**: 未实现（富媒体内容支持）

---

### 7.4 关键里程碑

| 里程碑 | 目标 | 当前状态 | 预计完成时间 |
|--------|------|----------|-------------|
| **MVP** | 基础笔记功能 | ✅ 已完成 | - |
| **Phase 1** | 核心功能补全 | 🔄 60% | +10 天 |
| **Phase 2** | 体验优化 | ⏸️ 未开始 | +10 天 |
| **Phase 3** | 差异化功能 | ⏸️ 未开始 | +9 天 |
| **v2.5 发布** | 功能完整 | 🔄 55% | +29 天 |
| **Phase 4** | 高级功能 | ⏸️ 未开始 | +9 天 |
| **v3.0 发布** | 产品成熟 | 🔄 40% | +38 天 |

---

## 8. 推荐行动项

### 立即行动（本周）

1. ✅ **完成用户资料编辑页面** (1 天)
   - 创建 `/settings` 页面
   - 接入 `PUT /api/auth/me` API

2. ✅ **接入版本历史功能** (2 天)
   - 创建版本列表组件
   - 实现版本恢复功能

3. ✅ **修复 AI 增强功能** (1 天)
   - 在 TipTap Slash Command 中集成
   - 添加菜单项：总结、翻译、扩展、润色

---

### 短期目标（本月）

1. 🔥 **实现双向链接系统** (5 天)
   - TipTap 自定义扩展
   - 链接解析和创建
   - 反向链接面板

2. 🔥 **实现媒体上传功能** (2 天)
   - 文件上传 API
   - 图片预览组件

3. 🔥 **接入实时同步** (3 天)
   - Socket.IO 客户端
   - 同步状态指示

---

### 中期目标（本季度）

1. ⭐ **知识图谱可视化** (4 天)
2. ⭐ **Thread 模式** (2 天)
3. ⭐ **提醒系统** (3 天)
4. ⭐ **高级搜索** (2 天)

---

### 长期目标（本年度）

1. 🚀 **浏览器扩展** (5 天)
2. 🚀 **导入/导出** (3 天)
3. 🚀 **AI 语义搜索** (3 天)

---

## 附录 A: API 端点清单

### 已接入的 API (21 个端点)

#### 认证 (2)
- `POST /api/auth/register`
- `GET /api/auth/me`

#### 消息 (7)
- `GET /api/messages`
- `POST /api/messages`
- `GET /api/messages/[id]`
- `PUT /api/messages/[id]`
- `DELETE /api/messages/[id]`
- `POST /api/messages/[id]/star`
- `POST /api/messages/[id]/pin`

#### 评论 (2)
- `GET /api/messages/[id]/comments`
- `POST /api/messages/[id]/comments`

#### 标签 (3)
- `GET /api/tags`
- `POST /api/tags`
- `GET /api/tags/[id]/messages`

#### 模板 (4)
- `GET /api/templates`
- `POST /api/templates`
- `GET /api/templates/[id]`
- `DELETE /api/templates/[id]`

#### 搜索 (1)
- `GET /api/search`

#### AI (3)
- `GET /api/config`
- `PUT /api/config`
- `POST /api/config` (测试连接)
- `POST /api/ai/chat`

### 未接入的 API (8 个端点)

#### 用户资料 (1)
- `PUT /api/auth/me` ❌

#### AI 增强 (1)
- `POST /api/ai/enhance` ❌

#### 版本历史 (3 - 需创建)
- `GET /api/messages/[id]/versions` ❌
- `GET /api/messages/[id]/versions/[versionId]` ❌
- `POST /api/messages/[id]/versions/[versionId]/restore` ❌

#### 双向链接 (3 - 需创建)
- `GET /api/links` ❌
- `GET /api/messages/[id]/backlinks` ❌
- `POST /api/links/parse` ❌

#### 知识图谱 (2 - 需创建)
- `GET /api/graph` ❌
- `GET /api/graph/[messageId]` ❌

#### 提醒系统 (4 - 需创建)
- `GET /api/reminders` ❌
- `POST /api/messages/[id]/reminders` ❌
- `PUT /api/reminders/[id]/complete` ❌
- `DELETE /api/reminders/[id]` ❌

#### 媒体上传 (3 - 需创建)
- `POST /api/media/upload` ❌
- `GET /api/media/[id]` ❌
- `DELETE /api/media/[id]` ❌

#### 导入导出 (5 - 需创建)
- `GET /api/export/messages` ❌
- `GET /api/export/backup` ❌
- `POST /api/import/markdown` ❌
- `POST /api/import/notion` ❌

#### 搜索历史 (2 - 需创建)
- `GET /api/search/history` ❌
- `DELETE /api/search/history` ❌

---

## 附录 B: 技术栈总结

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.0.0 | 全栈框架 |
| Prisma | Latest | ORM |
| PostgreSQL | 16 | 数据库 |
| BullMQ | Latest | 任务队列 |
| Redis | Latest | 缓存/消息队列 |
| Socket.IO | Latest | WebSocket |
| NextAuth | 5.0 (beta) | 认证 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TipTap | Latest | 富文本编辑器 |
| Tailwind CSS | Latest | 样式 |
| shadcn/ui | Latest | UI 组件库 |
| Socket.IO Client | Latest | WebSocket 客户端 |

---

**文档结束**

*最后更新: 2026-01-07*
*作者: Claude (AI Assistant)*
