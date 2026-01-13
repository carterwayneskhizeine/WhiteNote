import { getAiConfig } from "./config"
import prisma from "@/lib/prisma"

interface RAGFlowMessage {
  role: "user" | "assistant"
  content: string
}

interface Media {
  id: string
  url: string
  type: string
}

/**
 * 清理消息内容，移除 AI 助手提及
 * 如果清理后内容为空，返回 "test"
 */
function cleanContentForRAGFlow(content: string): string {
  // 移除所有 @goldierill 和 @GoldieRill 提及（不区分大小写）
  const cleaned = content.replace(/@goldierill/gi, "").trim()

  // 如果清理后内容为空，返回 "test"
  if (cleaned.length === 0) {
    return "test"
  }

  return cleaned
}

interface RAGFlowResponse {
  choices: Array<{
    message: {
      content: string
      reference?: Array<{
        content: string
        document_name: string
        similarity: number
      }>
    }
  }>
}

/**
 * 调用 RAGFlow OpenAI 兼容接口
 * 配置从数据库实时读取 (热更新)
 */
export async function callRAGFlow(
  userId: string,
  messages: RAGFlowMessage[]
): Promise<{ content: string; references?: Array<{ content: string; source: string }> }> {
  // 每次调用获取最新配置 (热更新核心)
  const config = await getAiConfig(userId)

  if (!config.ragflowApiKey) {
    throw new Error("RAGFlow API key not configured")
  }

  if (!config.ragflowChatId) {
    throw new Error("RAGFlow Chat ID not configured")
  }

  const response = await fetch(
    `${config.ragflowBaseUrl}/api/v1/chats_openai/${config.ragflowChatId}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.ragflowApiKey}`,
      },
      body: JSON.stringify({
        model: "model",
        messages,
        stream: false,
        extra_body: {
          reference: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`RAGFlow API error: ${error}`)
  }

  const data: RAGFlowResponse = await response.json()
  const message = data.choices[0]?.message

  const references = message?.reference
    ? message.reference.map((ref) => ({
        content: ref.content,
        source: ref.document_name,
      }))
    : undefined

  return {
    content: message?.content || "",
    references,
  }
}

/**
 * 上传图片到 RAGFlow 并获取描述
 */
async function uploadImageToRAGFlow(
  config: any,
  messageId: string,
  media: Media
): Promise<string | null> {
  try {
    console.log("[RAGFlow] Uploading image:", media.url)

    // 1. 上传图片文档，使用 picture chunk method
    const formData = new FormData()

    // 构建完整的图片 URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005'
    const fullImageUrl = media.url.startsWith('http')
      ? media.url
      : `${baseUrl}${media.url}`

    console.log("[RAGFlow] Full image URL:", fullImageUrl)

    // 从 URL 下载图片
    const imageResponse = await fetch(fullImageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }
    const imageBlob = await imageResponse.blob()

    formData.append('file', imageBlob, `image_${messageId}_${media.id}.png`)

    const uploadResponse = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
        body: formData,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error("[RAGFlow] Failed to upload image:", errorText)
      throw new Error(`Image upload failed: ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const documentId = uploadResult.data?.[0]?.id

    if (!documentId) {
      throw new Error("No document ID returned from upload")
    }

    console.log("[RAGFlow] Image uploaded, document ID:", documentId)

    // 2. 更新文档配置为 picture chunk method
    const updateResponse = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents/${documentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
        body: JSON.stringify({
          chunk_method: "picture",
          parser_config: {},
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error("[RAGFlow] Failed to update document config:", errorText)
      throw new Error(`Document config update failed: ${errorText}`)
    }

    console.log("[RAGFlow] Document config updated to picture method")

    // 3. 触发解析
    const parseResponse = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/chunks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
        body: JSON.stringify({
          document_ids: [documentId],
        }),
      }
    )

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text()
      console.error("[RAGFlow] Failed to trigger parsing:", errorText)
      throw new Error(`Parse trigger failed: ${errorText}`)
    }

    console.log("[RAGFlow] Parsing triggered, waiting for completion...")

    // 4. 等待解析完成（对于图片，直接等待固定时间，因为 GET document 返回图片二进制而不是 JSON）
    console.log("[RAGFlow] Waiting 20 seconds for image processing...")
    await new Promise(resolve => setTimeout(resolve, 20000))

    // 5. 尝试获取 chunks（可能需要多次尝试）
    const maxChunkAttempts = 10 // 最多尝试 10 次
    let chunks: any[] = []

    for (let i = 0; i < maxChunkAttempts; i++) {
      if (i > 0) {
        console.log(`[RAGFlow] Retry ${i}/${maxChunkAttempts - 1}: waiting 5 more seconds...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

      const chunksResponse = await fetch(
        `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents/${documentId}/chunks`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.ragflowApiKey}`,
          },
        }
      )

      if (chunksResponse.ok) {
        try {
          const chunksResult = await chunksResponse.json()
          chunks = chunksResult.data?.chunks || []

          if (chunks.length > 0) {
            console.log("[RAGFlow] Successfully retrieved chunks, count:", chunks.length)
            break
          } else {
            console.log(`[RAGFlow] Chunk attempt ${i + 1}: no chunks yet, waiting...`)
          }
        } catch (error) {
          console.error("[RAGFlow] Failed to parse chunks response:", error)
        }
      } else {
        console.log(`[RAGFlow] Chunk attempt ${i + 1}: request failed with status ${chunksResponse.status}`)
      }
    }

    // 6. 提取图片描述
    if (chunks.length > 0) {
      // 第一个 chunk 的 content 就是图片描述
      const description = chunks[0].content || ""
      console.log("[RAGFlow] Image description extracted:", description.substring(0, 100))
      return description
    }

    console.warn("[RAGFlow] No chunks found for image after all attempts")
    return null
  } catch (error) {
    console.error("[RAGFlow] Error processing image:", error)
    return null
  }
}

/**
 * 同步消息到 RAGFlow 知识库 (热更新)
 */
export async function syncToRAGFlow(
  userId: string,
  messageId: string,
  content: string,
  medias?: Media[]
) {
  const config = await getAiConfig(userId)

  if (!config.ragflowApiKey || !config.ragflowDatasetId) {
    console.warn("RAGFlow not configured, skipping sync")
    return
  }

  try {
    // 清理内容：移除 AI 助手提及
    const cleanedContent = cleanContentForRAGFlow(content)

    // 使用 FormData 上传文件（RAGFlow API 要求 multipart/form-data）
    const formData = new FormData()
    const blob = new Blob([cleanedContent], { type: 'text/markdown' })
    formData.append('file', blob, `message_${messageId}.md`)

    const response = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.ragflowApiKey}`,
          // 注意：不手动设置 Content-Type，让浏览器自动设置并添加 boundary
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[RAGFlow] Failed to sync message:", messageId, "Error:", errorText)
      throw new Error(`RAGFlow sync failed: ${errorText}`)
    }

    const result = await response.json()
    console.log("[RAGFlow] Successfully synced message:", messageId, "Document:", result.data?.[0]?.id)

    // 触发文档解析（自动生成 chunks）
    if (result.data?.[0]?.id) {
      const documentId = result.data[0].id
      await fetch(
        `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.ragflowApiKey}`,
          },
          body: JSON.stringify({
            document_ids: [documentId],
          }),
        }
      )
      console.log("[RAGFlow] Triggered parsing for document:", documentId)
    }

    // 处理图片：上传到 RAGFlow 并获取描述
    console.log("[RAGFlow] Checking medias:", medias?.length || 0, "items")
    if (medias && medias.length > 0) {
      console.log("[RAGFlow] Medias:", JSON.stringify(medias))
      for (const media of medias) {
        console.log("[RAGFlow] Processing media:", media.id, "type:", media.type)
        // 只处理图片类型（type 可能是 "image" 或 "image/xxx"）
        if (media.type === "image" || media.type.startsWith("image/")) {
          console.log("[RAGFlow] Processing image:", media.id)

          const description = await uploadImageToRAGFlow(config, messageId, media)

          if (description) {
            // 更新 Media 记录的描述
            try {
              await prisma.media.update({
                where: { id: media.id },
                data: { description },
              })
              console.log("[RAGFlow] Updated media description:", media.id)
            } catch (error) {
              console.error("[RAGFlow] Failed to update media description:", error)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[RAGFlow] Sync error for message:", messageId, error)
    throw error
  }
}

/**
 * 从 RAGFlow 删除文档（通用函数，支持消息和评论）
 * @param userId 用户 ID
 * @param id 消息 ID 或评论 ID
 * @param contentType 内容类型 ('message' | 'comment')
 */
export async function deleteFromRAGFlow(userId: string, id: string, contentType: 'message' | 'comment' = 'message') {
  const config = await getAiConfig(userId)

  if (!config.ragflowApiKey || !config.ragflowDatasetId) {
    console.warn(`[RAGFlow] Not configured, skipping delete for ${contentType}`)
    return
  }

  try {
    // 1. 删除文本文档（文档名格式：message_{id}.md）
    const documentName = `message_${id}.md`

    const listResponse = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents?name=${encodeURIComponent(documentName)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
      }
    )

    if (listResponse.ok) {
      const listResult = await listResponse.json()

      if (listResult.data?.docs && listResult.data.docs.length > 0) {
        const documentIds = listResult.data.docs.map((doc: any) => doc.id)

        const deleteResponse = await fetch(
          `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.ragflowApiKey}`,
            },
            body: JSON.stringify({
              ids: documentIds,
            }),
          }
        )

        if (deleteResponse.ok) {
          console.log(`[RAGFlow] Successfully deleted ${contentType} text document:`, id)
        } else {
          console.error("[RAGFlow] Failed to delete text document:", await deleteResponse.text())
        }
      }
    } else {
      console.error("[RAGFlow] Failed to list documents:", await listResponse.text())
    }

    // 2. 删除图片文档（文档名格式：image_{id}_{mediaId}.png）
    // 通过列出所有文档并过滤匹配的文档来删除
    const allDocsResponse = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
      }
    )

    if (allDocsResponse.ok) {
      const allDocsResult = await allDocsResponse.json()
      const allDocs = allDocsResult.data?.docs || []

      // 过滤出属于该消息的图片文档
      const imageDocs = allDocs.filter((doc: any) => {
        const docName = doc.name || ""
        return docName.startsWith(`image_${id}_`) && docName.endsWith(".png")
      })

      if (imageDocs.length > 0) {
        const imageDocIds = imageDocs.map((doc: any) => doc.id)

        const deleteImagesResponse = await fetch(
          `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.ragflowApiKey}`,
            },
            body: JSON.stringify({
              ids: imageDocIds,
            }),
          }
        )

        if (deleteImagesResponse.ok) {
          console.log(`[RAGFlow] Successfully deleted ${imageDocIds.length} image documents for ${contentType}:`, id)
        } else {
          console.error("[RAGFlow] Failed to delete image documents:", await deleteImagesResponse.text())
        }
      }
    } else {
      console.error("[RAGFlow] Failed to list all documents for image deletion:", await allDocsResponse.text())
    }
  } catch (error) {
    console.error(`[RAGFlow] Delete error for ${contentType}:`, id, error)
    // 不抛出错误，避免影响本地删除操作
  }
}

/**
 * 更新 RAGFlow 中的文档（先删除旧文档，再上传新文档）
 * @param userId 用户 ID
 * @param messageId 消息 ID
 * @param content 新的消息内容
 */
export async function updateRAGFlow(userId: string, messageId: string, content: string) {
  const config = await getAiConfig(userId)

  if (!config.ragflowApiKey || !config.ragflowDatasetId) {
    console.warn("[RAGFlow] Not configured, skipping update")
    return
  }

  try {
    console.log("[RAGFlow] Updating message:", messageId)

    // 1. 先删除旧文档
    await deleteFromRAGFlow(userId, messageId)

    // 2. 清理内容：移除 AI 助手提及
    const cleanedContent = cleanContentForRAGFlow(content)

    // 3. 上传新文档（复用同步逻辑）
    const formData = new FormData()
    const blob = new Blob([cleanedContent], { type: 'text/markdown' })
    formData.append('file', blob, `message_${messageId}.md`)

    const response = await fetch(
      `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/documents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.ragflowApiKey}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[RAGFlow] Failed to update message:", messageId, "Error:", errorText)
      throw new Error(`RAGFlow update failed: ${errorText}`)
    }

    const result = await response.json()
    console.log("[RAGFlow] Successfully updated message:", messageId, "Document:", result.data?.[0]?.id)

    // 3. 触发文档解析（自动生成 chunks）
    if (result.data?.[0]?.id) {
      const documentId = result.data[0].id
      await fetch(
        `${config.ragflowBaseUrl}/api/v1/datasets/${config.ragflowDatasetId}/chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.ragflowApiKey}`,
          },
          body: JSON.stringify({
            document_ids: [documentId],
          }),
        }
      )
      console.log("[RAGFlow] Triggered parsing for updated document:", documentId)
    }
  } catch (error) {
    console.error("[RAGFlow] Update error for message:", messageId, error)
    // 不抛出错误，避免影响本地更新操作
  }
}
