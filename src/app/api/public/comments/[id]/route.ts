import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/public/comments/[id]
 * 公开的 API 端点，用于分享页面，不需要认证
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const comment = await prisma.comment.findUnique({
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
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
      medias: {
        select: { id: true, url: true, type: true, description: true },
      },
      message: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  })

  if (!comment) {
    return Response.json({ error: "Comment not found" }, { status: 404 })
  }

  return Response.json({ data: comment })
}
