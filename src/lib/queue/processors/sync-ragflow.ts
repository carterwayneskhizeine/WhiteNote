import { Job } from "bullmq"
import prisma from "@/lib/prisma"
import { syncToRAGFlow } from "@/lib/ai/ragflow"

interface SyncRAGFlowJobData {
  userId: string
  messageId: string
}

export async function processSyncRAGFlow(job: Job<SyncRAGFlowJobData>) {
  const { userId, messageId } = job.data

  console.log(`[SyncRAGFlow] Processing message: ${messageId}`)

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
      const tagLine = message.tags.map((t) => `#${t.tag.name}`).join('  ')
      contentWithTags = `${tagLine}\n\n${message.content}`
    }

    await syncToRAGFlow(userId, message.id, contentWithTags)
  }

  console.log(`[SyncRAGFlow] Completed for message: ${messageId}`)
}
