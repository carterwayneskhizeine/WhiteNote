import { Job } from "bullmq"
import prisma from "@/lib/prisma"
import { callOpenAI } from "@/lib/ai/openai"
import { buildSystemPrompt } from "@/lib/ai/openai"
import { batchUpsertTags, connectTagsToMessage } from "@/lib/tag-utils"

export async function processDailyBriefing(job: Job) {
  console.log(`[DailyBriefing] Starting daily briefing generation`)

  // 获取所有启用晨报的 Workspace
  const workspacesWithBriefing = await prisma.workspace.findMany({
    where: { enableBriefing: true },
    include: {
      user: {
        include: {
          aiConfig: true
        }
      }
    }
  })

  if (workspacesWithBriefing.length === 0) {
    console.log(`[DailyBriefing] No workspaces with briefing enabled, skipping`)
    return
  }

  console.log(`[DailyBriefing] Found ${workspacesWithBriefing.length} workspaces with briefing enabled`)

  // 为每个 Workspace 生成晨报
  for (const workspace of workspacesWithBriefing) {
    console.log(`[DailyBriefing] Generating briefing for workspace: ${workspace.name} (user: ${workspace.user.email})`)

    const config = workspace.user.aiConfig
    if (!config) continue

    // 获取昨天的笔记
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const messages = await prisma.message.findMany({
      where: {
        workspaceId: workspace.id,
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
      select: { content: true },
      orderBy: { createdAt: "asc" },
    })

    if (messages.length === 0) {
      console.log(`[DailyBriefing] No messages yesterday for workspace: ${workspace.name}`)
      continue
    }

    console.log(`[DailyBriefing] Found ${messages.length} messages for workspace: ${workspace.name}`)

    // 生成晨报
    const systemPrompt = await buildSystemPrompt(workspace.userId)
    const contentSummary = messages.map((m) => m.content).join("\n---\n")

    const briefingPrompt = `请根据用户昨天的笔记内容生成一份简短的晨报。

昨日笔记内容：
${contentSummary}

请包含以下部分：
1. 📝 昨日回顾：总结昨天记录的主要内容和想法
2. 💡 关键洞察：从笔记中提取的重要观点或学习
3. 🎯 今日建议：基于昨日内容，给出今天可以做的事情

保持简洁，使用 markdown 格式。`

    try {
      const briefingContent = await callOpenAI({
        userId: workspace.userId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: briefingPrompt },
        ],
        model: config.briefingModel,
      })

      // 取消之前的晨报道顶（查找带有 DailyReview 标签的消息）
      const dailyReviewTag = await prisma.tag.findUnique({
        where: { name: "DailyReview" },
      })

      if (dailyReviewTag) {
        await prisma.message.updateMany({
          where: {
            workspaceId: workspace.id,
            authorId: null,  // 晨报的 authorId 为 null
            tags: {
              some: { tagId: dailyReviewTag.id },
            },
          },
          data: { isPinned: false },
        })
        console.log(`[DailyBriefing] Unpinned previous briefings for workspace: ${workspace.name}`)
      }

      // 创建晨报消息（authorId 为 null，表示由系统生成）
      const yesterdayStr = yesterday.toLocaleDateString("zh-CN")
      const briefing = await prisma.message.create({
        data: {
          content: `# ☀️ 每日晨报 - ${workspace.name} - ${yesterdayStr}\n\n${briefingContent}`,
          workspaceId: workspace.id,
          authorId: null,  // 系统生成，没有作者
          isPinned: true,
        },
      })

      // 批量添加 DailyReview 标签
      const tagIds = await batchUpsertTags(["DailyReview"])
      await connectTagsToMessage(briefing.id, tagIds)

      console.log(`[DailyBriefing] Created briefing for ${workspace.name}: ${briefing.id}`)
    } catch (error) {
      console.error(`[DailyBriefing] Failed for workspace ${workspace.name}:`, error)
    }
  }

  console.log(`[DailyBriefing] Completed all briefings`)
}
