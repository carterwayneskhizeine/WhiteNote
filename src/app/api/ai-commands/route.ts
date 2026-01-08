import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/ai-commands
 * 获取所有AI命令（内置+用户自定义）
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const commands = await prisma.aICommand.findMany({
    where: {
      OR: [
        { isBuiltIn: true },
        { authorId: session.user.id },
      ],
    },
    orderBy: [
      { isBuiltIn: "desc" },
      { label: "asc" },
    ],
  })

  return Response.json({ data: commands })
}

/**
 * POST /api/ai-commands
 * 创建自定义AI命令
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { label, description, action, prompt } = body

    if (!label || !description || !action || !prompt) {
      return Response.json(
        { error: "Label, description, action, and prompt are required" },
        { status: 400 }
      )
    }

    // 检查action是否已存在
    const existingCommand = await prisma.aICommand.findUnique({
      where: { action: action.trim() },
    })

    if (existingCommand) {
      return Response.json(
        { error: "Action already exists" },
        { status: 400 }
      )
    }

    const command = await prisma.aICommand.create({
      data: {
        label: label.trim(),
        description: description.trim(),
        action: action.trim(),
        prompt: prompt.trim(),
        authorId: session.user.id,
        isBuiltIn: false,
      },
    })

    return Response.json({ data: command }, { status: 201 })
  } catch (error) {
    console.error("Failed to create AI command:", error)
    return Response.json({ error: "Failed to create AI command" }, { status: 500 })
  }
}
