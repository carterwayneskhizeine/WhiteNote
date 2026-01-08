import { auth } from "@/lib/auth"
import { callOpenAI } from "@/lib/ai/openai"
import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

export const runtime = 'nodejs'

// Fallback prompts for built-in commands (in case database is not available)
const fallbackPrompts: Record<string, string> = {
  summarize: '请总结以下内容的要点，用简洁的中文回复：\n\n{content}',
  translate: '请将以下内容翻译成英文：\n\n{content}',
  expand: '请扩展以下简短内容，使其更加完整和详细：\n\n{content}',
  polish: '请润色以下内容，使其更加流畅和专业，保持原意：\n\n{content}',
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, content, target } = body

    if (!action || !content) {
      return Response.json(
        { error: "action and content are required" },
        { status: 400 }
      )
    }

    // Try to get the command from database first
    const promptTemplate = await prisma.aICommand.findFirst({
      where: {
        action,
        OR: [
          { isBuiltIn: true },
          { authorId: session.user.id },
        ],
      },
    })

    // Get prompt from database or use fallback
    const promptText = promptTemplate?.prompt || fallbackPrompts[action] || `{content}`

    // Replace {content} placeholder with actual content
    let prompt = promptText.replace(/\{content\}/g, content)

    // If target is provided (for translation), append it
    if (target && action === 'translate') {
      prompt = prompt.replace(/翻译成.*?[：:]/, `翻译成 ${target}：`)
    }

    const result = await callOpenAI({
      userId: session.user.id,
      messages: [
        { role: "system", content: "你是一个专业的文本处理助手。" },
        { role: "user", content: prompt },
      ],
    })

    return Response.json({ data: { result } })
  } catch (error) {
    console.error("AI enhance error:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "AI service error" },
      { status: 500 }
    )
  }
}
