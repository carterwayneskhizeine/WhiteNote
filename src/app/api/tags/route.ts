import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"
import { cleanupUnusedTags } from "@/lib/tag-utils"

/**
 * GET /api/tags
 * 获取所有标签 (含消息数量，按热度排序)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { messages: true },
      },
    },
    orderBy: {
      messages: { _count: "desc" },
    },
  })

  // 格式化响应
  const formattedTags = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    count: tag._count.messages,
  }))

  return Response.json({ data: formattedTags })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * POST /api/tags
 * 创建新标签
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { name, color } = body

    if (!name || name.trim() === "") {
      return Response.json({ error: "Name is required" }, { status: 400 })
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || null,
      },
    })

    return Response.json({ data: tag }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    if ((error as { code?: string }).code === "P2002") {
      return Response.json({ error: "Tag already exists" }, { status: 409 })
    }
    throw error
  }
}

/**
 * DELETE /api/tags
 * 清理未使用的标签 (消息数量为0的标签)
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await requireAuth()

    const result = await cleanupUnusedTags()

    return Response.json({ data: result })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to cleanup unused tags:", error)
    return Response.json({ error: "Failed to cleanup tags" }, { status: 500 })
  }
}
