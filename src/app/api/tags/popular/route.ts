import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * GET /api/tags/popular
 * 获取热门标签列表（按使用次数排序）
 * 支持按 workspaceId 过滤
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const workspaceId = searchParams.get("workspaceId")

    // 获取热门标签（统计 MessageTag 和 CommentTag 的使用次数）
    let popularTags

    if (workspaceId) {
      // 按 workspaceId 过滤：只统计该 workspace 下的消息标签
      const tagStats = await prisma.$queryRaw<Array<{ tagid: string; name: string; color: string | null; count: bigint }>>`
        SELECT
          t.id as "tagid",
          t.name,
          t.color,
          COUNT(mt."messageId") as count
        FROM "Tag" t
        INNER JOIN "MessageTag" mt ON t.id = mt."tagId"
        INNER JOIN "Message" m ON mt."messageId" = m.id
        WHERE m."workspaceId" = ${workspaceId}
          AND m."authorId" = ${session.user.id}
        GROUP BY t.id, t.name, t.color
        HAVING COUNT(mt."messageId") > 0
        ORDER BY count DESC
        LIMIT ${limit}
      `
      popularTags = tagStats.map((stat) => ({
        id: stat.tagid,
        name: stat.name,
        color: stat.color,
        count: Number(stat.count),
      }))
    } else {
      // 全局热门标签：统计用户所有消息的标签
      const tagStats = await prisma.$queryRaw<Array<{ tagid: string; name: string; color: string | null; count: bigint }>>`
        SELECT
          t.id as "tagid",
          t.name,
          t.color,
          COUNT(mt."messageId") as count
        FROM "Tag" t
        INNER JOIN "MessageTag" mt ON t.id = mt."tagId"
        INNER JOIN "Message" m ON mt."messageId" = m.id
        WHERE m."authorId" = ${session.user.id}
        GROUP BY t.id, t.name, t.color
        HAVING COUNT(mt."messageId") > 0
        ORDER BY count DESC
        LIMIT ${limit}
      `
      popularTags = tagStats.map((stat) => ({
        id: stat.tagid,
        name: stat.name,
        color: stat.color,
        count: Number(stat.count),
      }))
    }

    return Response.json({
      data: popularTags,
    })
  } catch (error) {
    console.error("Failed to fetch popular tags:", error)
    return Response.json(
      { error: "Failed to fetch popular tags" },
      { status: 500 }
    )
  }
}
