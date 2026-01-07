import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * POST /api/messages/[id]/star
 * 切换消息的收藏状态
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
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
    console.error("Failed to toggle star:", error)
    return Response.json({ error: "Failed to toggle star" }, { status: 500 })
  }
}
