import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/public/messages/[id]
 * 公开的 API 端点，用于分享页面，不需要认证
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const message = await prisma.message.findUnique({
    where: { id },
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
            select: { id: true, name: true, avatar: true, email: true }
          },
          medias: {
            select: { id: true, url: true, type: true, description: true }
          }
        }
      },
      quotedComment: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          messageId: true,
          author: {
            select: { id: true, name: true, avatar: true, email: true }
          },
          medias: {
            select: { id: true, url: true, type: true, description: true }
          }
        }
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
        select: { comments: true, retweets: true },
      },
    },
  })

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 })
  }

  // 添加转发计数
  const retweetCount = (message as any)._count.retweets

  const messageData = {
    ...message,
    retweetCount,
  }

  return Response.json({ data: messageData })
}
