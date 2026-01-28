import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getAiConfig } from "@/lib/ai/config"
import { provisionRAGFlowForWorkspace } from "@/lib/ragflow/provision"

export const runtime = 'nodejs'

/**
 * POST /api/workspaces/[id]/reset-ragflow
 * 重置 Workspace 的 RAGFlow 资源
 * 先删除旧的 Dataset 和 Chat，再创建新的
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. 验证 Workspace 存在且属于当前用户
    const workspace = await prisma.workspace.findUnique({
      where: { id }
    })

    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. 检查是否已初始化 RAGFlow
    if (!workspace.ragflowDatasetId || !workspace.ragflowChatId) {
      return Response.json({
        error: "该工作区尚未初始化 RAGFlow 资源，请先点击\"初始化\"按钮"
      }, { status: 400 })
    }

    // 3. 获取用户的 RAGFlow 配置
    const config = await getAiConfig(session.user.id)

    if (!config.ragflowBaseUrl || !config.ragflowApiKey) {
      return Response.json({
        error: "RAGFlow 配置不完整，请先在 AI 设置中配置 RAGFlow Base URL 和 API Key"
      }, { status: 400 })
    }

    console.log(`[Workspaces API] Resetting RAGFlow resources for workspace ${id}...`)
    console.log(`[Workspaces API] Old dataset: ${workspace.ragflowDatasetId}, chat: ${workspace.ragflowChatId}`)

    // 4. 删除旧的 Chat
    if (workspace.ragflowChatId) {
      try {
        const deleteChatResponse = await fetch(`${config.ragflowBaseUrl}/api/v1/chats`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ragflowApiKey}`
          },
          body: JSON.stringify({ ids: [workspace.ragflowChatId] })
        })

        if (deleteChatResponse.ok) {
          console.log(`[Workspaces API] Deleted old chat: ${workspace.ragflowChatId}`)
        } else {
          const errorText = await deleteChatResponse.text()
          console.error(`[Workspaces API] Failed to delete old chat:`, errorText)
        }
      } catch (error) {
        console.error(`[Workspaces API] Error deleting old chat:`, error)
      }
    }

    // 5. 删除旧的 Dataset
    if (workspace.ragflowDatasetId) {
      try {
        const deleteDatasetResponse = await fetch(`${config.ragflowBaseUrl}/api/v1/datasets`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.ragflowApiKey}`
          },
          body: JSON.stringify({ ids: [workspace.ragflowDatasetId] })
        })

        if (deleteDatasetResponse.ok) {
          console.log(`[Workspaces API] Deleted old dataset: ${workspace.ragflowDatasetId}`)
        } else {
          const errorText = await deleteDatasetResponse.text()
          console.error(`[Workspaces API] Failed to delete old dataset:`, errorText)
        }
      } catch (error) {
        console.error(`[Workspaces API] Error deleting old dataset:`, error)
      }
    }

    // 6. 调用 RAGFlow provision 函数创建新资源
    console.log(`[Workspaces API] Creating new RAGFlow resources...`)
    const { datasetId, chatId } = await provisionRAGFlowForWorkspace(
      config.ragflowBaseUrl,
      config.ragflowApiKey,
      workspace.name,
      session.user.id
    )

    // 7. 更新 Workspace 记录
    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ragflowDatasetId: datasetId,
        ragflowChatId: chatId
      }
    })

    console.log(`[Workspaces API] Reset completed for workspace ${id}: new dataset=${datasetId}, new chat=${chatId}`)

    return Response.json({
      success: true,
      data: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        ragflowDatasetId: updatedWorkspace.ragflowDatasetId,
        ragflowChatId: updatedWorkspace.ragflowChatId
      },
      message: `重置成功：已删除旧的 RAGFlow 资源并创建新的知识库和聊天助手`
    })
  } catch (error) {
    console.error("[Workspaces API] Error resetting RAGFlow:", error)
    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : "重置 RAGFlow 资源失败"
      },
      { status: 500 }
    )
  }
}
