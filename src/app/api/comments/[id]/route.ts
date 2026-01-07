import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/comments/[id]
 * 获取单个评论详情
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatar: true, email: true } },
      message: { select: { id: true, content: true } },
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
}
