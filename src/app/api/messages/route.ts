import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getPaginationParams } from "@/lib/validation"
import { addTask } from "@/lib/queue"
import { NextRequest } from "next/server"
import { batchUpsertTags } from "@/lib/tag-utils"
import { getSocketServer } from "@/lib/socket/server"

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

  // 构建基础查询条件
  const baseWhere: Record<string, unknown> = {}

  if (tagId) {
    baseWhere.tags = { some: { tagId } }
  }
  if (isStarred !== undefined) {
    baseWhere.isStarred = isStarred
  }
  if (isPinned !== undefined) {
    baseWhere.isPinned = isPinned
  }
  if (parentId) {
    baseWhere.parentId = parentId
  } else if (rootOnly) {
    baseWhere.parentId = null
  }

  // 构建最终查询条件：用户的消息 OR 系统生成的晨报
  // 系统消息也需要应用 rootOnly、isStarred、isPinned 过滤器（如果设置了）
  const systemMessageWhere: Record<string, unknown> = {
    authorId: null,
    tags: { some: { tag: { name: "dailyreview" } } },  // 标签名在数据库中是小写
  }
  if (rootOnly) {
    systemMessageWhere.parentId = null
  }
  // 应用收藏和置顶过滤器到系统消息
  if (isStarred !== undefined) {
    systemMessageWhere.isStarred = isStarred
  }
  if (isPinned !== undefined) {
    systemMessageWhere.isPinned = isPinned
  }

  const where: Record<string, unknown> = {
    OR: [
      { authorId: session.user.id, ...baseWhere },  // 用户的消息
      systemMessageWhere,  // 系统生成的晨报
    ]
  }

  // 查询消息
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        quotedMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, avatar: true, email: true },
            },
            medias: {
              select: { id: true, url: true, type: true, description: true },
            },
          },
        },
        quotedComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            messageId: true,
            author: {
              select: { id: true, name: true, avatar: true, email: true },
            },
            medias: {
              select: { id: true, url: true, type: true, description: true },
            },
          },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        medias: {
          select: { id: true, url: true, type: true, description: true },
        },
        _count: {
          select: { children: true, comments: true, retweets: true },
        },
        retweets: {
          where: { userId: session.user.id },
          select: { id: true },
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

  // 获取所有消息ID，用于计算转发总数（包括引用转发）
  const messageIds = messages.map(m => m.id)
  const quoteRetweetCounts = await prisma.message.groupBy({
    by: ['quotedMessageId'],
    where: {
      quotedMessageId: { in: messageIds },
    },
    _count: { quotedMessageId: true },
  })
  const quoteRetweetCountMap = Object.fromEntries(
    quoteRetweetCounts.map(r => [r.quotedMessageId!, r._count.quotedMessageId])
  )

  // 添加转发相关字段（包含简单转发和引用转发）
  const messagesWithRetweetInfo = messages.map((message) => ({
    ...message,
    retweetCount: message._count.retweets + (quoteRetweetCountMap[message.id] || 0),
    isRetweeted: message.retweets.length > 0,
  }))

  return Response.json({
    data: messagesWithRetweetInfo,
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
    const { content, title, parentId, tags, quotedMessageId, quotedCommentId, media } = body

    // Allow empty content if media is provided
    if ((!content || content.trim() === "") && (!media || media.length === 0)) {
      return Response.json(
        { error: "Content or media is required" },
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

    // 验证引用消息存在 (如果指定)
    if (quotedMessageId) {
      const quotedMessage = await prisma.message.findUnique({
        where: { id: quotedMessageId },
      })
      if (!quotedMessage) {
        return Response.json(
          { error: "Quoted message not found" },
          { status: 404 }
        )
      }
    }

    // 验证引用评论存在 (如果指定)
    if (quotedCommentId) {
      const quotedComment = await prisma.comment.findUnique({
        where: { id: quotedCommentId },
      })
      if (!quotedComment) {
        return Response.json(
          { error: "Quoted comment not found" },
          { status: 404 }
        )
      }
    }

    // 批量处理标签（优化：将 N+1 查询减少到最多 3 次查询）
    let tagIds: string[] = []
    if (tags?.length > 0) {
      tagIds = await batchUpsertTags(tags)
    }

    // 创建消息
    const message = await prisma.message.create({
      data: {
        title: title?.trim() || null,
        content: content?.trim() || "",
        authorId: session.user.id,
        parentId: parentId || null,
        quotedMessageId: quotedMessageId || null,
        quotedCommentId: quotedCommentId || null,
        // 批量关联标签（使用优化后的批量查询）
        tags: tagIds.length > 0
          ? {
            create: tagIds.map((tagId) => ({ tagId })),
          }
          : undefined,
        // 关联媒体文件
        medias: media && media.length > 0
          ? {
            create: media.map((m: { url: string; type: string }) => ({
              url: m.url,
              type: m.type,
            })),
          }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        quotedMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, avatar: true, email: true },
            },
            medias: {
              select: { id: true, url: true, type: true, description: true },
            },
          },
        },
        quotedComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            messageId: true,
            author: {
              select: { id: true, name: true, avatar: true, email: true },
            },
            medias: {
              select: { id: true, url: true, type: true, description: true },
            },
          },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        medias: {
          select: { id: true, url: true, type: true, description: true },
        },
        _count: {
          select: { children: true, comments: true, retweets: true },
        },
        retweets: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    })

    // 获取引用转发数量
    const quoteRetweetCount = await prisma.message.count({
      where: { quotedMessageId: message.id },
    })

    // 添加转发相关字段（包含简单转发和引用转发）
    const messageWithRetweetInfo = {
      ...message,
      retweetCount: message._count.retweets + quoteRetweetCount,
      isRetweeted: message.retweets.length > 0,
    }

    // 获取用户 AI 配置
    const config = await prisma.aiConfig.findUnique({
      where: { userId: session.user.id },
    })

    // 添加自动打标签任务（如果启用）
    // 注意：auto-tag 完成后会自动触发 sync-ragflow，确保标签被包含
    if (config?.enableAutoTag) {
      await addTask("auto-tag", {
        userId: session.user.id,
        messageId: message.id,
      })
    } else {
      // 如果未启用自动打标签，直接同步到 RAGFlow
      await addTask("sync-ragflow", {
        userId: session.user.id,
        messageId: message.id,
      })
    }

    // 通知同用户的其他设备有新消息
    console.log("🔍 [DEBUG] Attempting to get Socket.IO server...")
    const io = getSocketServer()

    if (!io) {
      console.error("❌ [DEBUG] Socket.IO server is NULL!")
      console.error("❌ [DEBUG] global._io:", typeof global !== 'undefined' ? global._io : 'global not defined')
    } else {
      console.log("✅ [DEBUG] Socket.IO server obtained successfully")
      const userRoom = `user:${session.user.id}`
      const timestamp = Date.now()

      try {
        // 获取发送请求的客户端ID（从请求头或cookie获取）
        // 注意：这里我们无法直接获取客户端ID，所以广播给所有设备
        // 由客户端根据session ID自己过滤
        const sockets = await io.in(userRoom).fetchSockets()
        console.log(`📡 [Socket] Broadcasting to ${sockets.length} sockets in room ${userRoom}`)

        // 广播给所有socket，让客户端自己判断
        io.to(userRoom).emit("message:created", {
          messageId: message.id,
          timestamp: timestamp,
          senderClientId: null, // 服务器无法获取发送者的client ID，由客户端过滤
        })
        console.log(`✅ [Socket] Broadcasted new message ${message.id} to user ${session.user.id} at ${timestamp}`)
      } catch (error) {
        console.error("❌ [Socket] Error broadcasting message:", error)
      }
    }

    return Response.json({ data: messageWithRetweetInfo }, { status: 201 })
  } catch (error) {
    console.error("Failed to create message:", error)
    return Response.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}
