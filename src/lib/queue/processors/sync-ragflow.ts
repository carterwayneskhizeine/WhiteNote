import { Job } from "bullmq"
import prisma from "@/lib/prisma"
import { syncToRAGFlow } from "@/lib/ai/ragflow"

interface SyncRAGFlowJobData {
  userId: string
  messageId: string
  contentType?: 'message' | 'comment'
}

export async function processSyncRAGFlow(job: Job<SyncRAGFlowJobData>) {
  const { userId, messageId, contentType = 'message' } = job.data

  console.log(`[SyncRAGFlow] Processing ${contentType}: ${messageId}`)

  if (contentType === 'message') {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        content: true,
        tags: {
          include: {
            tag: {
              select: { name: true },
            },
          },
          orderBy: {
            tag: { name: 'asc' },
          },
        },
      },
    })

    if (message) {
      // 如果有标签，格式化标签放在内容开头
      let contentWithTags = message.content
      if (message.tags.length > 0) {
        const tagLine = message.tags.map((t) => `#${t.tag.name}`).join(' ')
        contentWithTags = `${tagLine}\n\n${message.content}`
      }

      await syncToRAGFlow(userId, message.id, contentWithTags)
    }
  } else {
    // 处理评论
    const comment = await prisma.comment.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        content: true,
        tags: {
          include: {
            tag: {
              select: { name: true },
            },
          },
          orderBy: {
            tag: { name: 'asc' },
          },
        },
      },
    })

    if (comment) {
      // 如果有标签，格式化标签放在内容开头
      let contentWithTags = comment.content
      if (comment.tags.length > 0) {
        const tagLine = comment.tags.map((t) => `#${t.tag.name}`).join(' ')
        contentWithTags = `${tagLine}\n\n${comment.content}`
      }

      await syncToRAGFlow(userId, comment.id, contentWithTags)
    }
  }

  console.log(`[SyncRAGFlow] Completed for ${contentType}: ${messageId}`)
}
