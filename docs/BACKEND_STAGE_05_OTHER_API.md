# WhiteNote 2.5 后端开发指南 - Stage 5: Tags/Comments/Templates API

> **前置文档**: [Stage 4: Messages API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_04_MESSAGES_API.md)  
> **下一步**: [Stage 6: AI 集成](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_06_AI.md)

---

## 目标

实现标签、评论、模板和搜索 API。

---

## Part 1: Tags API

### 创建 `src/app/api/tags/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/tags
 * 获取所有标签 (含消息数量，按热度排序)
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { messages: true },
      },
    },
    orderBy: {
      messages: { _count: "desc" },
    },
  })

  // 格式化响应
  const formattedTags = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    count: tag._count.messages,
  }))

  return Response.json({ data: formattedTags })
}

/**
 * POST /api/tags
 * 创建新标签
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || name.trim() === "") {
      return Response.json({ error: "Name is required" }, { status: 400 })
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || null,
      },
    })

    return Response.json({ data: tag }, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return Response.json({ error: "Tag already exists" }, { status: 409 })
    }
    throw error
  }
}
```

### 创建 `src/app/api/tags/[id]/messages/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPaginationParams } from "@/lib/validation"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/tags/[id]/messages
 * 获取标签下的所有消息
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { page, limit, skip } = getPaginationParams(request)

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: {
        authorId: session.user.id,
        tags: { some: { tagId: params.id } },
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({
      where: {
        authorId: session.user.id,
        tags: { some: { tagId: params.id } },
      },
    }),
  ])

  return Response.json({
    data: messages,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}
```

---

## Part 2: Comments API

### 创建 `src/app/api/messages/[id]/comments/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/messages/[id]/comments
 * 获取消息的评论列表
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const comments = await prisma.comment.findMany({
    where: { messageId: params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return Response.json({ data: comments })
}

/**
 * POST /api/messages/[id]/comments
 * 添加评论
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 验证消息存在
  const message = await prisma.message.findUnique({
    where: { id: params.id },
  })

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === "") {
      return Response.json({ error: "Content is required" }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        messageId: params.id,
        authorId: session.user.id,
        isAIBot: false,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    })

    return Response.json({ data: comment }, { status: 201 })
  } catch (error) {
    console.error("Failed to create comment:", error)
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
```

---

## Part 3: Templates API

### 创建 `src/app/api/templates/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/templates
 * 获取所有模板
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const templates = await prisma.template.findMany({
    where: {
      OR: [
        { isBuiltIn: true },
        { authorId: session.user.id },
      ],
    },
    orderBy: [
      { isBuiltIn: "desc" },
      { name: "asc" },
    ],
  })

  return Response.json({ data: templates })
}

/**
 * POST /api/templates
 * 创建自定义模板
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, content, description } = body

    if (!name || !content) {
      return Response.json(
        { error: "Name and content are required" },
        { status: 400 }
      )
    }

    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        description: description?.trim() || null,
        authorId: session.user.id,
        isBuiltIn: false,
      },
    })

    return Response.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error("Failed to create template:", error)
    return Response.json({ error: "Failed to create template" }, { status: 500 })
  }
}
```

### 创建 `src/app/api/templates/[id]/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/templates/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
  })

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 })
  }

  return Response.json({ data: template })
}

/**
 * DELETE /api/templates/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const template = await prisma.template.findUnique({
    where: { id: params.id },
  })

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 })
  }

  if (template.isBuiltIn) {
    return Response.json({ error: "Cannot delete built-in template" }, { status: 403 })
  }

  if (template.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.template.delete({ where: { id: params.id } })

  return Response.json({ success: true })
}
```

---

## Part 4: Search API

### 创建 `src/app/api/search/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPaginationParams } from "@/lib/validation"
import { NextRequest } from "next/server"

/**
 * GET /api/search
 * 全局搜索
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query || query.trim() === "") {
    return Response.json({ error: "Query is required" }, { status: 400 })
  }

  const { page, limit, skip } = getPaginationParams(request)

  // 保存搜索历史
  await prisma.searchHistory.create({
    data: { query: query.trim() },
  })

  // 搜索消息
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: {
        authorId: session.user.id,
        content: {
          contains: query.trim(),
          mode: "insensitive",
        },
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({
      where: {
        authorId: session.user.id,
        content: { contains: query.trim(), mode: "insensitive" },
      },
    }),
  ])

  return Response.json({
    data: messages,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}
```

---

## Part 5: AI Config API

### 创建 `src/app/api/config/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/config
 * 获取 AI 配置
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let config = await prisma.aiConfig.findUnique({
    where: { id: "global_config" },
  })

  // 如果不存在，创建默认配置
  if (!config) {
    config = await prisma.aiConfig.create({
      data: { id: "global_config" },
    })
  }

  // 隐藏敏感字段
  return Response.json({
    data: {
      ...config,
      openaiApiKey: config.openaiApiKey ? "***" : "",
    },
  })
}

/**
 * PUT /api/config
 * 更新 AI 配置
 */
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // 过滤允许更新的字段
    const allowedFields = [
      "openaiBaseUrl",
      "openaiApiKey",
      "openaiModel",
      "enableRag",
      "ragTimeFilterStart",
      "ragTimeFilterEnd",
      "enableAutoTag",
      "enableBriefing",
      "briefingTime",
      "aiPersonality",
      "aiExpertise",
      "enableLinkSuggestion",
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const config = await prisma.aiConfig.upsert({
      where: { id: "global_config" },
      update: updateData,
      create: { id: "global_config", ...updateData },
    })

    return Response.json({
      data: {
        ...config,
        openaiApiKey: config.openaiApiKey ? "***" : "",
      },
    })
  } catch (error) {
    console.error("Failed to update config:", error)
    return Response.json({ error: "Failed to update config" }, { status: 500 })
  }
}
```

---

## API 端点汇总

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| Tags | `/api/tags` | GET | 获取所有标签 |
| | `/api/tags` | POST | 创建标签 |
| | `/api/tags/[id]/messages` | GET | 获取标签下的消息 |
| Comments | `/api/messages/[id]/comments` | GET | 获取评论列表 |
| | `/api/messages/[id]/comments` | POST | 添加评论 |
| Templates | `/api/templates` | GET | 获取模板列表 |
| | `/api/templates` | POST | 创建模板 |
| | `/api/templates/[id]` | GET/DELETE | 模板详情/删除 |
| Search | `/api/search?q=` | GET | 全局搜索 |
| Config | `/api/config` | GET/PUT | AI 配置 |

---

## 下一步

继续 [Stage 6: AI 集成](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_06_AI.md)。
