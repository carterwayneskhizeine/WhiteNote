import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/comments/[id]
 * 获取单个评论详情
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatar: true, email: true } },
      message: { select: { id: true, content: true } },
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
  })

  if (!comment) {
    return Response.json({ error: "Comment not found" }, { status: 404 })
  }

  // 添加转发相关字段
  const retweetCount = (comment as any)._count.retweets
  const isRetweeted = (comment as any).retweets.length > 0

  // @ts-ignore - retweets is included in the query
  const { retweets, ...commentData } = comment

  const commentWithRetweetInfo = {
    ...commentData,
    retweetCount,
    isRetweeted,
  }

  return Response.json({ data: commentWithRetweetInfo })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * DELETE /api/comments/[id]
 * 删除评论
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // 检查评论是否存在
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { message: { select: { authorId: true } } },
  })

  if (!comment) {
    return Response.json({ error: "Comment not found" }, { status: 404 })
  }

  // 授权检查：
  // 1. 如果评论有作者（普通评论），只有作者可以删除
  // 2. 如果评论没有作者（AI 生成评论），只有消息作者可以删除
  if (comment.authorId) {
    // 普通评论：只有作者可以删除
    if (comment.authorId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  } else {
    // AI 评论：只有消息作者可以删除
    if (comment.message.authorId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // 删除评论（级联删除子评论）
  await prisma.comment.delete({
    where: { id },
  })

  return Response.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * PATCH /api/comments/[id]
 * 更新评论
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return Response.json({ error: "Content is required" }, { status: 400 })
    }

    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { message: { select: { authorId: true } } },
    })

    if (!comment) {
      return Response.json({ error: "Comment not found" }, { status: 404 })
    }

    // 授权检查：
    // 1. 如果评论有作者（普通评论），只有作者可以编辑
    // 2. 如果评论没有作者（AI 生成评论），只有消息作者可以编辑
    if (comment.authorId) {
      // 普通评论：只有作者可以编辑
      if (comment.authorId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 })
      }
    } else {
      // AI 评论：只有消息作者可以编辑
      if (comment.message.authorId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // 更新评论
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
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
      },
    })

    return Response.json({ data: updatedComment })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to update comment:", error)
    return Response.json({ error: "Failed to update comment" }, { status: 500 })
  }
}
