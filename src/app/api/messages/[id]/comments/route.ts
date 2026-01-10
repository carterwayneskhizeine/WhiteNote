import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

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

  // 添加转发相关字段
  const commentsWithRetweetInfo = comments.map((comment: any) => ({
    ...comment,
    _count: {
      ...comment._count,
    },
    retweetCount: comment._count.retweets,
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
    const { content, parentId } = body

    if (!content || content.trim() === "") {
      return Response.json({ error: "Content is required" }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        messageId: id,
        authorId: session.user.id,
        isAIBot: false,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } },
      },
    })

    return Response.json({ data: comment }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to create comment:", error)
    return Response.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
