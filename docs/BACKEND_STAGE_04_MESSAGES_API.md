# WhiteNote 2.5 后端开发指南 - Stage 4: Messages API

> **前置文档**: [Stage 3: 认证系统](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_03_AUTH.md)  
> **下一步**: [Stage 5: Tags/Comments/Templates API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_05_OTHER_API.md)

---

## 目标

实现 Messages 核心 API，包括创建、读取、更新、删除、收藏和置顶功能。

---

## API 端点概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/messages` | GET | 获取消息列表 (时间线) |
| `/api/messages` | POST | 创建新消息 |
| `/api/messages/[id]` | GET | 获取单条消息详情 |
| `/api/messages/[id]` | PUT | 更新消息 |
| `/api/messages/[id]` | DELETE | 删除消息 |
| `/api/messages/[id]/star` | POST | 切换收藏状态 |
| `/api/messages/[id]/pin` | POST | 切换置顶状态 |

---

## Step 1: 创建类型定义

创建 `src/types/api.ts`：

```typescript
// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
}

// 消息过滤参数
export interface MessageFilters {
  tagId?: string
  isStarred?: boolean
  isPinned?: boolean
  parentId?: string | null  // null = 仅根消息
  search?: string
}

// 创建消息参数
export interface CreateMessageInput {
  content: string
  parentId?: string
  tags?: string[]  // 标签名称数组
}

// 更新消息参数
export interface UpdateMessageInput {
  content?: string
  tags?: string[]
}

// API 响应
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// 消息详情 (包含关联数据)
export interface MessageWithRelations {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  isStarred: boolean
  isPinned: boolean
  authorId: string
  parentId: string | null
  author: {
    id: string
    name: string | null
    avatar: string | null
  }
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string | null
    }
  }>
  _count: {
    children: number
    comments: number
  }
}
```

---

## Step 2: 创建请求验证工具

创建 `src/lib/validation.ts`：

```typescript
import { NextRequest } from "next/server"

/**
 * 解析分页参数
 */
export function getPaginationParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * 验证必填字段
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[]
): string | null {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      return `Field '${String(field)}' is required`
    }
  }
  return null
}
```

---

## Step 3: 创建 Messages 列表 API

创建 `src/app/api/messages/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPaginationParams } from "@/lib/validation"
import { NextRequest } from "next/server"

/**
 * GET /api/messages
 * 获取消息列表 (时间线)
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { page, limit, skip } = getPaginationParams(request)
  const searchParams = request.nextUrl.searchParams

  // 解析过滤参数
  const tagId = searchParams.get("tagId")
  const isStarred = searchParams.get("isStarred") === "true" ? true : undefined
  const isPinned = searchParams.get("isPinned") === "true" ? true : undefined
  const parentId = searchParams.get("parentId")
  const rootOnly = searchParams.get("rootOnly") === "true"

  // 构建查询条件
  const where: Record<string, unknown> = {
    authorId: session.user.id,
  }

  if (tagId) {
    where.tags = { some: { tagId } }
  }
  if (isStarred !== undefined) {
    where.isStarred = isStarred
  }
  if (isPinned !== undefined) {
    where.isPinned = isPinned
  }
  if (parentId) {
    where.parentId = parentId
  } else if (rootOnly) {
    where.parentId = null
  }

  // 查询消息
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: { children: true, comments: true },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.message.count({ where }),
  ])

  return Response.json({
    data: messages,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * POST /api/messages
 * 创建新消息
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, parentId, tags } = body

    if (!content || content.trim() === "") {
      return Response.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    // 验证父消息存在 (如果指定)
    if (parentId) {
      const parent = await prisma.message.findUnique({
        where: { id: parentId },
      })
      if (!parent) {
        return Response.json(
          { error: "Parent message not found" },
          { status: 404 }
        )
      }
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        parentId: parentId || null,
        // 创建或关联标签
        tags: tags?.length
          ? {
              create: await Promise.all(
                tags.map(async (tagName: string) => {
                  const tag = await prisma.tag.upsert({
                    where: { name: tagName },
                    create: { name: tagName },
                    update: {},
                  })
                  return { tagId: tag.id }
                })
              ),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: { children: true, comments: true },
        },
      },
    })

    return Response.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error("Failed to create message:", error)
    return Response.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: 创建单条消息 API

创建 `src/app/api/messages/[id]/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/messages/[id]
 * 获取单条消息详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const message = await prisma.message.findUnique({
    where: { id: params.id },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      children: {
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          _count: { select: { children: true, comments: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      incomingLinks: {
        include: {
          source: {
            select: { id: true, content: true },
          },
        },
      },
      _count: {
        select: { children: true, comments: true, versions: true },
      },
    },
  })

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  // 权限检查
  if (message.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return Response.json({ data: message })
}

/**
 * PUT /api/messages/[id]
 * 更新消息
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.message.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  if (existing.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { content, tags } = body

    // 保存版本历史
    if (content && content !== existing.content) {
      await prisma.messageVersion.create({
        data: {
          messageId: params.id,
          content: existing.content,
        },
      })
    }

    // 更新消息
    const message = await prisma.message.update({
      where: { id: params.id },
      data: {
        content: content?.trim() || existing.content,
        // 更新标签 (如果提供)
        tags: tags
          ? {
              deleteMany: {},
              create: await Promise.all(
                tags.map(async (tagName: string) => {
                  const tag = await prisma.tag.upsert({
                    where: { name: tagName },
                    create: { name: tagName },
                    update: {},
                  })
                  return { tagId: tag.id }
                })
              ),
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { children: true, comments: true } },
      },
    })

    return Response.json({ data: message })
  } catch (error) {
    console.error("Failed to update message:", error)
    return Response.json(
      { error: "Failed to update message" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/messages/[id]
 * 删除消息
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.message.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  if (existing.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.message.delete({
    where: { id: params.id },
  })

  return Response.json({ success: true })
}
```

---

## Step 5: 创建收藏/置顶 API

创建 `src/app/api/messages/[id]/star/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/messages/[id]/star
 * 切换收藏状态
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const message = await prisma.message.findUnique({
    where: { id: params.id },
  })

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  if (message.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.message.update({
    where: { id: params.id },
    data: { isStarred: !message.isStarred },
    select: { id: true, isStarred: true },
  })

  return Response.json({ data: updated })
}
```

创建 `src/app/api/messages/[id]/pin/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/messages/[id]/pin
 * 切换置顶状态
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const message = await prisma.message.findUnique({
    where: { id: params.id },
  })

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  if (message.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.message.update({
    where: { id: params.id },
    data: { isPinned: !message.isPinned },
    select: { id: true, isPinned: true },
  })

  return Response.json({ data: updated })
}
```

---

## 验证检查点

启动服务器后使用 cURL 测试：

```bash
# 1. 创建消息
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"content":"Hello WhiteNote!","tags":["test","first"]}'

# 2. 获取时间线
curl http://localhost:3000/api/messages \
  -H "Cookie: <session-cookie>"

# 3. 获取单条消息
curl http://localhost:3000/api/messages/<message-id> \
  -H "Cookie: <session-cookie>"

# 4. 收藏消息
curl -X POST http://localhost:3000/api/messages/<message-id>/star \
  -H "Cookie: <session-cookie>"
```

---

## 下一步

继续 [Stage 5: Tags/Comments/Templates API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_05_OTHER_API.md)。
