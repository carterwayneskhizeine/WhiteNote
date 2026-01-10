import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * POST /api/messages/[id]/star
 * 切换消息的收藏状态
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // 获取消息
    const message = await prisma.message.findUnique({
      where: { id },
    })

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 })
    }

    // 切换isStarred状态
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isStarred: !message.isStarred,
      },
      select: {
        id: true,
        isStarred: true,
      },
    })

    return Response.json({ data: updatedMessage })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to toggle star:", error)
    return Response.json({ error: "Failed to toggle star" }, { status: 500 })
  }
}
