import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"
import { addTask } from "@/lib/queue"

/**
 * GET /api/messages/[id]/comments
 * 获取消息的评论列表
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const comments = await prisma.comment.findMany({
    where: { messageId: id },
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
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      medias: {
        select: { id: true, url: true, type: true, description: true }
      },
      _count: {
        select: { replies: true, retweets: true }
      },
      retweets: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // 获取所有评论ID，用于计算转发总数（包括被消息引用）
  const commentIds = comments.map(c => c.id)
  const quotedByCounts = await prisma.message.groupBy({
    by: ['quotedCommentId'],
    where: {
      quotedCommentId: { in: commentIds },
    },
    _count: { quotedCommentId: true },
  })
  const quotedByCountMap = Object.fromEntries(
    quotedByCounts.map(r => [r.quotedCommentId!, r._count.quotedCommentId])
  )

  // 添加转发相关字段
  const commentsWithRetweetInfo = comments.map((comment: any) => ({
    ...comment,
    _count: {
      ...comment._count,
    },
    retweetCount: comment._count.retweets + (quotedByCountMap[comment.id] || 0),
    isRetweeted: comment.retweets.length > 0,
  }))

  return Response.json({ data: commentsWithRetweetInfo })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * POST /api/messages/[id]/comments
 * 添加评论
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // 验证消息存在
    const message = await prisma.message.findUnique({
      where: { id },
    })

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 })
    }

    const body = await request.json()
    const { content, parentId, media } = body

    if ((!content || content.trim() === "") && (!media || media.length === 0)) {
      return Response.json({ error: "Content or media is required" }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content?.trim() || "",
        messageId: id,
        authorId: session.user.id,
        isAIBot: false,
        parentId: parentId || null,
        medias: media && media.length > 0 ? {
          create: media.map((m: { url: string; type: string }) => ({
            url: m.url,
            type: m.type,
          }))
        } : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        medias: { select: { id: true, url: true, type: true, description: true } },
      },
    })

    // 获取用户 AI 配置
    const config = await prisma.aiConfig.findUnique({
      where: { userId: session.user.id },
    })

    // 添加自动打标签任务（如果启用）
    if (config?.enableAutoTag) {
      await addTask("auto-tag-comment", {
        userId: session.user.id,
        commentId: comment.id,
        contentType: 'comment',
      })
    } else {
      // 如果未启用自动打标签，直接同步到 RAGFlow
      await addTask("sync-ragflow", {
        userId: session.user.id,
        messageId: comment.id,
        contentType: 'comment',
      })
    }

    return Response.json({ data: comment }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to create comment:", error)
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
