const EMBEDDING_MODEL = 'Qwen/Qwen3-Embedding-8B@SILICONFLOW'
const CHUNK_METHOD = 'one'
const INIT_CONTENT = '这是一条预设的向量化文本内容，用于初始化知识库。'
const SYSTEM_PROMPT = `你是一个运行在 WhiteNote 的智能助手你叫 Goldie Rill，请总结 WhiteNote 帖子的内容来回答问题，请列举 WhiteNote 帖子中的数据详细回答。当所有WhiteNote 帖子内容都与问题无关时，你的回答必须包括"WhiteNote 中未找到您要的答案！"这句话。回答需要考虑聊天历史。以下是 WhiteNote 帖子：{knowledge}以上是 WhiteNote 帖子。`

interface ProvisionResult {
  datasetId: string
  chatId: string
}

/**
 * 为 Workspace 自动创建 RAGFlow 资源（Dataset + Chat）
 * @param ragflowBaseUrl RAGFlow 服务地址
 * @param ragflowApiKey RAGFlow API Key
 * @param workspaceName Workspace 名称
 * @param userId 用户 ID
 * @returns datasetId 和 chatId
 */
export async function provisionRAGFlowForWorkspace(
  ragflowBaseUrl: string,
  ragflowApiKey: string,
  workspaceName: string,
  userId: string
): Promise<ProvisionResult> {
  const datasetName = `${userId}_${workspaceName}`
  const chatName = `GoldieRill_${workspaceName}`

  try {
    // 1. 创建 Dataset（知识库）
    console.log(`[RAGFlow Provision] Creating dataset: ${datasetName}`)
    const datasetResponse = await fetch(`${ragflowBaseUrl}/api/v1/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ragflowApiKey}`
      },
      body: JSON.stringify({
        name: datasetName,
        embedding_model: EMBEDDING_MODEL,
        chunk_method: CHUNK_METHOD
      })
    })

    const datasetResult = await datasetResponse.json()
    if (datasetResult.code !== 0 || !datasetResult.data) {
      throw new Error(`创建知识库失败: ${datasetResult.message}`)
    }
    const datasetId = datasetResult.data.id
    console.log(`[RAGFlow Provision] Dataset created: ${datasetId}`)

    // 2. 上传初始文档（RAGFlow 要求 Dataset 必须有文档才能绑定 Chat）
    console.log(`[RAGFlow Provision] Uploading initial document...`)
    const formData = new FormData()
    const blob = new Blob([INIT_CONTENT], { type: 'text/plain' })
    formData.append('file', blob, 'init.txt')

    const docResponse = await fetch(
      `${ragflowBaseUrl}/api/v1/datasets/${datasetId}/documents`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ragflowApiKey}` },
        body: formData
      }
    )

    const docResult = await docResponse.json()
    if (docResult.code !== 0 || !docResult.data?.[0]) {
      throw new Error(`创建文档失败: ${docResult.message}`)
    }
    const documentId = docResult.data[0].id
    console.log(`[RAGFlow Provision] Document created: ${documentId}`)

    // 3. 添加 Chunk（向量化）
    console.log(`[RAGFlow Provision] Adding chunks...`)
    await fetch(
      `${ragflowBaseUrl}/api/v1/datasets/${datasetId}/documents/${documentId}/chunks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ragflowApiKey}`
        },
        body: JSON.stringify({ content: INIT_CONTENT })
      }
    )
    console.log(`[RAGFlow Provision] Chunks added`)

    // 4. 创建 Chat（绑定知识库）
    console.log(`[RAGFlow Provision] Creating chat: ${chatName}`)
    const chatResponse = await fetch(`${ragflowBaseUrl}/api/v1/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ragflowApiKey}`
      },
      body: JSON.stringify({
        name: chatName,
        dataset_ids: [datasetId],
        prompt: {
          prompt: SYSTEM_PROMPT
        }
      })
    })

    const chatResult = await chatResponse.json()
    if (chatResult.code !== 0 || !chatResult.data) {
      throw new Error(`创建聊天失败: ${chatResult.message}`)
    }
    const chatId = chatResult.data.id
    console.log(`[RAGFlow Provision] Chat created: ${chatId}`)

    // 5. 更新 Chat 配置（关闭开场白和空回复）
    console.log(`[RAGFlow Provision] Updating chat configuration...`)
    await fetch(`${ragflowBaseUrl}/api/v1/chats/${chatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ragflowApiKey}`
      },
      body: JSON.stringify({
        dataset_ids: [datasetId],
        prompt: {
          prompt: SYSTEM_PROMPT,
          empty_response: null,  // 关闭空回复
          opener: null           // 关闭开场白
        }
      })
    })
    console.log(`[RAGFlow Provision] Chat configuration updated`)

    // 注意：LLM 参数 (temperature, top_p 等) 无法通过 API 关闭
    // 需要在 RAGFlow UI (http://localhost:4154) 中手动设置

    return { datasetId, chatId }
  } catch (error) {
    console.error(`[RAGFlow Provision] Error:`, error)
    throw error
  }
}
