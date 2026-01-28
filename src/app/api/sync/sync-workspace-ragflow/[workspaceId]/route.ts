import { requireAuth, AuthError } from "@/lib/api-auth"
import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { syncToRAGFlowWithDatasetId } from "@/lib/ai/ragflow"
import { getAiConfig } from "@/lib/ai/config"

/**
 * POST /api/sync/sync-workspace-ragflow/[workspaceId]
 * Sync all messages and comments from a single workspace to RAGFlow knowledge base
 * Useful for resyncing a specific workspace after configuration changes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    const { workspaceId } = await params

    // Get user's AI config
    const config = await getAiConfig(userId)

    if (!config.ragflowBaseUrl || !config.ragflowApiKey) {
      return Response.json(
        { error: "RAGFlow 配置不完整，请先配置 Base URL 和 API Key" },
        { status: 400 }
      )
    }

    // Get the workspace with RAGFlow dataset ID
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        userId,
      },
      select: {
        id: true,
        name: true,
        ragflowDatasetId: true,
      },
    })

    if (!workspace) {
      return Response.json(
        { error: "工作区不存在" },
        { status: 404 }
      )
    }

    if (!workspace.ragflowDatasetId) {
      return Response.json(
        { error: "该工作区尚未配置 RAGFlow Dataset，请先初始化 RAGFlow 资源" },
        { status: 400 }
      )
    }

    let messagesSynced = 0
    let commentsSynced = 0
    const errors: string[] = []

    try {
      // Get all messages in this workspace
      const messages = await prisma.message.findMany({
        where: {
          workspaceId: workspace.id,
        },
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
          medias: {
            select: {
              id: true,
              url: true,
              type: true,
            },
          },
        },
      })

      // Sync each message
      for (const message of messages) {
        try {
          // Format content with tags
          let contentWithTags = message.content
          if (message.tags.length > 0) {
            const tagLine = message.tags.map((t) => `#${t.tag.name}`).join(' ')
            contentWithTags = `${tagLine}\n\n${message.content}`
          }

          await syncToRAGFlowWithDatasetId(
            config.ragflowBaseUrl!,
            config.ragflowApiKey!,
            workspace.ragflowDatasetId!,
            message.id,
            contentWithTags,
            message.medias
          )
          messagesSynced++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          errors.push(`Message ${message.id}: ${errorMsg}`)
          console.error(`[SyncWorkspaceRAGFlow] Failed to sync message ${message.id}:`, error)
        }
      }

      // Get all comments in this workspace
      const comments = await prisma.comment.findMany({
        where: {
          message: {
            workspaceId: workspace.id,
          },
        },
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
          medias: {
            select: {
              id: true,
              url: true,
              type: true,
            },
          },
        },
      })

      // Sync each comment
      for (const comment of comments) {
        try {
          // Format content with tags
          let contentWithTags = comment.content
          if (comment.tags.length > 0) {
            const tagLine = comment.tags.map((t) => `#${t.tag.name}`).join(' ')
            contentWithTags = `${tagLine}\n\n${comment.content}`
          }

          await syncToRAGFlowWithDatasetId(
            config.ragflowBaseUrl!,
            config.ragflowApiKey!,
            workspace.ragflowDatasetId!,
            comment.id,
            contentWithTags,
            comment.medias
          )
          commentsSynced++
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          errors.push(`Comment ${comment.id}: ${errorMsg}`)
          console.error(`[SyncWorkspaceRAGFlow] Failed to sync comment ${comment.id}:`, error)
        }
      }

      console.log(`[SyncWorkspaceRAGFlow] Completed workspace ${workspace.name}: ${messagesSynced} messages, ${commentsSynced} comments`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`Workspace ${workspace.name}: ${errorMsg}`)
      console.error(`[SyncWorkspaceRAGFlow] Failed to sync workspace ${workspace.name}:`, error)
    }

    return Response.json({
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        messagesSynced,
        commentsSynced,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `同步完成工作区 "${workspace.name}"：${messagesSynced} 条消息，${commentsSynced} 条评论${errors.length > 0 ? `，${errors.length} 个错误` : ''}`,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to sync workspace to RAGFlow:", error)
    return Response.json(
      { error: "同步到 RAGFlow 失败" },
      { status: 500 }
    )
  }
}
