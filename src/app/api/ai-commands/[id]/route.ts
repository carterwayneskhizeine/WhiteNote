import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/ai-commands/[id]
 * 获取单个AI命令
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const command = await prisma.aICommand.findFirst({
    where: {
      id,
      OR: [
        { isBuiltIn: true },
        { authorId: session.user.id },
      ],
    },
  })

  if (!command) {
    return Response.json({ error: "Command not found" }, { status: 404 })
  }

  return Response.json({ data: command })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * PUT /api/ai-commands/[id]
 * 更新AI命令
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const command = await prisma.aICommand.findUnique({
      where: { id },
    })

    if (!command) {
      return Response.json({ error: "Command not found" }, { status: 404 })
    }

    // 内置命令不允许修改
    if (command.isBuiltIn) {
      return Response.json(
        { error: "Cannot modify built-in command" },
        { status: 403 }
      )
    }

    // 只允许作者修改自己的命令
    if (command.authorId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { label, description, prompt } = body

    const updatedCommand = await prisma.aICommand.update({
      where: { id },
      data: {
        ...(label && { label: label.trim() }),
        ...(description && { description: description.trim() }),
        ...(prompt && { prompt: prompt.trim() }),
      },
    })

    return Response.json({ data: updatedCommand })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to update AI command:", error)
    return Response.json({ error: "Failed to update AI command" }, { status: 500 })
  }
}

/**
 * DELETE /api/ai-commands/[id]
 * 删除AI命令
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const command = await prisma.aICommand.findUnique({
      where: { id },
    })

    if (!command) {
      return Response.json({ error: "Command not found" }, { status: 404 })
    }

    // 内置命令不允许删除
    if (command.isBuiltIn) {
      return Response.json(
        { error: "Cannot delete built-in command" },
        { status: 403 }
      )
    }

    // 只允许作者删除自己的命令
    if (command.authorId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.aICommand.delete({
      where: { id },
    })

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to delete AI command:", error)
    return Response.json({ error: "Failed to delete AI command" }, { status: 500 })
  }
}
