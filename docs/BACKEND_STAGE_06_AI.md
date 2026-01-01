# WhiteNote 2.5 后端开发指南 - Stage 6: AI 集成

> **前置文档**: [Stage 5: Tags/Comments/Templates API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_05_OTHER_API.md)  
> **下一步**: [Stage 7: 后台任务队列](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_07_WORKERS.md)

---

## 目标

实现 AI 功能集成，包括标准模式（直接调用 LLM）和 RAG 模式（RAGFlow 知识库检索）。

---

## RAGFlow 配置信息

> **RAGFlow 服务地址**: `http://localhost:4154`  
> **API Key**: `ragflow-61LVcg1JlwvJPHPmDLEHiw5NWfG6-QUvWShJ6gcbQSc`  
> **Chat ID**: `1c4db240e66011f09080b2cef1c18441`  
> **Dataset ID**: `96b74969e65411f09f5fb2cef1c18441`

---

## Step 1: 创建 AI 服务封装

### 创建 `src/lib/ai/openai.ts`：

```typescript
import { prisma } from "@/lib/prisma"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface ChatOptions {
  messages: ChatMessage[]
  stream?: boolean
}

/**
 * 获取 AI 配置
 */
async function getAiConfig() {
  let config = await prisma.aiConfig.findUnique({
    where: { id: "global_config" },
  })

  if (!config) {
    config = await prisma.aiConfig.create({
      data: { id: "global_config" },
    })
  }

  return config
}

/**
 * 调用 OpenAI 兼容接口 (标准模式)
 */
export async function callOpenAI(options: ChatOptions): Promise<string> {
  const config = await getAiConfig()

  if (!config.openaiApiKey) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch(`${config.openaiBaseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: options.messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

/**
 * 构建 AI 人设系统提示词
 */
export async function buildSystemPrompt(): Promise<string> {
  const config = await getAiConfig()

  const personalities: Record<string, string> = {
    friendly: "你是一个友好、热情的 AI 助手，语气亲切自然。",
    professional: "你是一个专业、严谨的 AI 助手，回答准确简洁。",
    casual: "你是一个轻松、幽默的 AI 伙伴，喜欢用轻松的方式交流。",
  }

  let prompt = personalities[config.aiPersonality] || personalities.friendly
  prompt += " 你是用户的第二大脑助手 @goldierill。"

  if (config.aiExpertise) {
    prompt += ` 你在 ${config.aiExpertise} 领域有深入的了解。`
  }

  return prompt
}
```

---

## Step 2: 创建 RAGFlow 服务封装

### 创建 `src/lib/ai/ragflow.ts`：

```typescript
import { prisma } from "@/lib/prisma"

interface RAGFlowMessage {
  role: "user" | "assistant"
  content: string
}

interface RAGFlowResponse {
  choices: Array<{
    message: {
      content: string
      reference?: {
        chunks: Record<string, {
          content: string
          document_name: string
          similarity: number
        }>
      }
    }
  }>
}

/**
 * 调用 RAGFlow OpenAI 兼容接口
 */
export async function callRAGFlow(
  chatId: string,
  messages: RAGFlowMessage[]
): Promise<{ content: string; references?: Array<{ content: string; source: string }> }> {
  const ragflowBaseUrl = process.env.RAGFLOW_BASE_URL || "http://localhost:4154"
  const ragflowApiKey = process.env.RAGFLOW_API_KEY || ""

  if (!ragflowApiKey) {
    throw new Error("RAGFlow API key not configured")
  }

  const response = await fetch(
    `${ragflowBaseUrl}/api/v1/chats_openai/${chatId}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ragflowApiKey}`,
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

  // 提取参考来源
  const references = message?.reference?.chunks
    ? Object.values(message.reference.chunks).map((chunk) => ({
        content: chunk.content,
        source: chunk.document_name,
      }))
    : undefined

  return {
    content: message?.content || "",
    references,
  }
}

/**
 * 同步消息到 RAGFlow 知识库
 */
export async function syncToRAGFlow(messageId: string, content: string) {
  const ragflowBaseUrl = process.env.RAGFLOW_BASE_URL || "http://localhost:4154"
  const ragflowApiKey = process.env.RAGFLOW_API_KEY || ""
  const datasetId = process.env.RAGFLOW_DATASET_ID || ""

  if (!ragflowApiKey || !datasetId) {
    console.warn("RAGFlow not configured, skipping sync")
    return
  }

  try {
    // 创建文档到知识库
    const response = await fetch(
      `${ragflowBaseUrl}/api/v1/datasets/${datasetId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ragflowApiKey}`,
        },
        body: JSON.stringify({
          name: `message_${messageId}.md`,
          content,
        }),
      }
    )

    if (!response.ok) {
      console.error("Failed to sync to RAGFlow:", await response.text())
    }
  } catch (error) {
    console.error("RAGFlow sync error:", error)
  }
}
```

---

## Step 3: 创建 AI 聊天 API

### 创建 `src/app/api/ai/chat/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildSystemPrompt, callOpenAI } from "@/lib/ai/openai"
import { callRAGFlow } from "@/lib/ai/ragflow"
import { NextRequest } from "next/server"

/**
 * POST /api/ai/chat
 * AI 聊天接口 (支持标准模式和 RAG 模式)
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messageId, content } = body

    if (!messageId || !content) {
      return Response.json(
        { error: "messageId and content are required" },
        { status: 400 }
      )
    }

    // 获取消息上下文
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          take: 20, // 最近 20 条评论作为上下文
        },
      },
    })

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 })
    }

    // 获取配置
    const config = await prisma.aiConfig.findUnique({
      where: { id: "global_config" },
    })

    let aiResponse: string
    let references: Array<{ content: string; source: string }> | undefined

    if (config?.enableRag) {
      // RAG 模式 - 调用 RAGFlow
      const chatId = process.env.RAGFLOW_CHAT_ID || ""
      
      const messages = [
        { role: "user" as const, content },
      ]

      const result = await callRAGFlow(chatId, messages)
      aiResponse = result.content
      references = result.references
    } else {
      // 标准模式 - 直接调用 OpenAI
      const systemPrompt = await buildSystemPrompt()

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `原文：${message.content}\n\n用户问题：${content}` },
      ]

      aiResponse = await callOpenAI({ messages })
    }

    // 保存 AI 回复为评论
    const comment = await prisma.comment.create({
      data: {
        content: aiResponse,
        messageId,
        isAIBot: true,
      },
    })

    return Response.json({
      data: {
        comment,
        references,
      },
    })
  } catch (error) {
    console.error("AI chat error:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "AI service error" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: 创建 AI 增强功能 API

### 创建 `src/app/api/ai/enhance/route.ts`：

```typescript
import { auth } from "@/lib/auth"
import { callOpenAI } from "@/lib/ai/openai"
import { NextRequest } from "next/server"

type EnhanceAction = "summarize" | "translate" | "expand" | "polish"

const prompts: Record<EnhanceAction, (content: string, target?: string) => string> = {
  summarize: (content) =>
    `请总结以下内容的要点，用简洁的中文回复：\n\n${content}`,
  translate: (content, target = "English") =>
    `请将以下内容翻译成 ${target}：\n\n${content}`,
  expand: (content) =>
    `请扩展以下简短内容，使其更加完整和详细：\n\n${content}`,
  polish: (content) =>
    `请润色以下内容，使其更加流畅和专业，保持原意：\n\n${content}`,
}

/**
 * POST /api/ai/enhance
 * AI 文本增强 (摘要、翻译、扩写、润色)
 */
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

    if (!prompts[action as EnhanceAction]) {
      return Response.json(
        { error: "Invalid action. Supported: summarize, translate, expand, polish" },
        { status: 400 }
      )
    }

    const prompt = prompts[action as EnhanceAction](content, target)

    const result = await callOpenAI({
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
```

---

## Step 5: 自动打标签服务

### 创建 `src/lib/ai/auto-tag.ts`：

```typescript
import { prisma } from "@/lib/prisma"
import { callOpenAI } from "./openai"

/**
 * 自动为消息生成标签
 */
export async function generateTags(content: string): Promise<string[]> {
  const prompt = `分析以下文本内容，提取 1-3 个最相关的标签/关键词。
要求：
1. 标签应该是简短的词语（1-3个词）
2. 可以是中文或英文
3. 只返回 JSON 数组格式，例如 ["React", "学习笔记", "Bug"]

文本内容：
${content}

返回格式（只返回 JSON 数组，不要其他内容）：`

  try {
    const result = await callOpenAI({
      messages: [
        { role: "system", content: "你是一个标签提取助手，只返回 JSON 数组格式的标签。" },
        { role: "user", content: prompt },
      ],
    })

    // 解析 JSON 响应
    const tags = JSON.parse(result.trim())
    
    if (Array.isArray(tags)) {
      return tags.slice(0, 3).map((t) => String(t).trim())
    }
    
    return []
  } catch (error) {
    console.error("Failed to generate tags:", error)
    return []
  }
}

/**
 * 为消息应用自动生成的标签
 */
export async function applyAutoTags(messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { content: true },
  })

  if (!message) return

  const tagNames = await generateTags(message.content)

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    })

    await prisma.messageTag.upsert({
      where: {
        messageId_tagId: { messageId, tagId: tag.id },
      },
      create: { messageId, tagId: tag.id },
      update: {},
    })
  }
}
```

---

## API 端点汇总

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/ai/chat` | POST | AI 聊天 (标准/RAG 模式) |
| `/api/ai/enhance` | POST | 文本增强 (摘要/翻译/扩写/润色) |

---

## 验证检查点

```bash
# 测试 AI 聊天
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"messageId":"<id>","content":"帮我总结这条笔记"}'

# 测试文本增强
curl -X POST http://localhost:3000/api/ai/enhance \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"action":"summarize","content":"这是一段很长的文字..."}'
```

---

## 下一步

继续 [Stage 7: 后台任务队列](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_07_WORKERS.md)。
