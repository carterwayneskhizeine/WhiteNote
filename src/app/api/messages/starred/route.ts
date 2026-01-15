import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/messages/starred
 * 获取用户收藏的所有消息
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const messages = await prisma.message.findMany({
      where: {
        authorId: session.user.id,
        isStarred: true,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return Response.json({ data: messages })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to fetch starred messages:", error)
    return Response.json({ error: "Failed to fetch starred messages" }, { status: 500 })
  }
}
