import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { buildSystemPrompt, callOpenAI } from "@/lib/ai/openai"
import { callRAGFlow } from "@/lib/ai/ragflow"
import { getAiConfig } from "@/lib/ai/config"
import { NextRequest } from "next/server"

/**
 * 从 RAGFlow 文档名称提取消息 ID
 * 例如: message_cmk73pxzu000ccgim9wb5f6bc.md -> cmk73pxzu000ccgim9wb5f6bc
 */
function extractMessageIdFromDocument(documentName: string): string | null {
  const match = documentName.match(/message_([a-z0-9]+)\.md$/i)
  return match ? match[1] : null
}

export const runtime = 'nodejs'

/**
 * POST /api/ai/chat
 * AI 聊天接口 (配置热更新)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { messageId, content } = body

    if (!messageId || !content) {
      return Response.json(
        { error: "messageId and content are required" },
        { status: 400 }
      )
    }

    // 获取消息上下文（数据隔离：用户只能对自己创建的消息使用 AI）
    const message = await prisma.message.findUnique({
      where: { id: messageId, authorId: session.user.id },
    })

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 })
    }

    // 获取最新配置 (热更新，如果不存在会自动创建默认配置)
    const config = await getAiConfig(session.user.id)

    let aiResponse: string
    let references: Array<{ content: string; source: string }> | undefined
    let quotedMessageId: string | undefined

    if (config.enableRag && config.ragflowApiKey && config.ragflowChatId) {
      // RAG 模式
      const messages = [{ role: "user" as const, content }]
      const result = await callRAGFlow(session.user.id, messages)
      aiResponse = result.content
      references = result.references

      // 从 references 中提取第一个（最相关）的 messageId
      if (references && references.length > 0) {
        quotedMessageId = extractMessageIdFromDocument(references[0].source) || undefined
      }
    } else {
      // 标准模式
      const systemPrompt = await buildSystemPrompt(session.user.id)
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `原文：${message.content}\n\n用户问题：${content}` },
      ]
      aiResponse = await callOpenAI({ userId: session.user.id, messages })
    }

    // 清理 AI 回复中的 [ID:0] 标记
    const cleanedResponse = aiResponse.replace(/\[ID:\d+\]/g, '').trim()

    // 保存 AI 回复（AI 评论的 authorId 为 null，包含引用）
    const comment = await prisma.comment.create({
      data: {
        content: cleanedResponse,
        messageId,
        isAIBot: true,
        quotedMessageId,
      },
      include: {
        quotedMessage: true,
      },
    })

    return Response.json({
      data: { comment, references },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("AI chat error:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "AI service error" },
      { status: 500 }
    )
  }
}
