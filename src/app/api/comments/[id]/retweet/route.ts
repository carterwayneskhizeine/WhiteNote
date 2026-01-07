import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * POST /api/comments/[id]/retweet
 * 切换评论的转发状态
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id },
    })

    if (!comment) {
      return Response.json({ error: "Comment not found" }, { status: 404 })
    }

    // 检查是否已经转发过
    const existingRetweet = await prisma.retweet.findUnique({
      where: {
        userId_commentId: {
          userId: session.user.id,
          commentId: id,
        },
      },
    })

    let isRetweeted: boolean

    if (existingRetweet) {
      // 如果已经转发，则取消转发
      await prisma.retweet.delete({
        where: {
          userId_commentId: {
            userId: session.user.id,
            commentId: id,
          },
        },
      })
      isRetweeted = false
    } else {
      // 如果未转发，则添加转发
      await prisma.retweet.create({
        data: {
          userId: session.user.id,
          commentId: id,
        },
      })
      isRetweeted = true
    }

    // 获取转发总数
    const retweetCount = await prisma.retweet.count({
      where: { commentId: id },
    })

    return Response.json({
      data: {
        isRetweeted,
        retweetCount,
      },
    })
  } catch (error) {
    console.error("Failed to toggle retweet:", error)
    return Response.json({ error: "Failed to toggle retweet" }, { status: 500 })
  }
}
