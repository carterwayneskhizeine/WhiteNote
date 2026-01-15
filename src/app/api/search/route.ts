import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { getPaginationParams } from "@/lib/validation"
import { NextRequest } from "next/server"

const MAX_SEARCH_HISTORY = 10

/**
 * 保存搜索历史，最多保留10条
 */
async function saveSearchHistory(query: string) {
  // 检查是否已存在相同的查询
  const existing = await prisma.searchHistory.findFirst({
    where: { query },
    orderBy: { createdAt: "desc" },
  })

  // 如果存在相同查询，删除旧的
  if (existing) {
    await prisma.searchHistory.delete({ where: { id: existing.id } })
  }

  // 创建新的搜索历史
  await prisma.searchHistory.create({ data: { query } })

  // 如果超过限制，删除最旧的记录
  const count = await prisma.searchHistory.count()
  if (count > MAX_SEARCH_HISTORY) {
    const oldestRecords = await prisma.searchHistory.findMany({
      orderBy: { createdAt: "asc" },
      take: count - MAX_SEARCH_HISTORY,
      select: { id: true },
    })
    await prisma.searchHistory.deleteMany({
      where: {
        id: { in: oldestRecords.map((r) => r.id) },
      },
    })
  }
}

/**
 * GET /api/search
 * 全局搜索
 *
 * 查询参数:
 * - q: 搜索关键词
 * - saveHistory: 是否保存搜索历史 (默认 true)
 * - history: 是否返回搜索历史 (默认 false)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const saveHistory = searchParams.get("saveHistory") !== "false"
  const returnHistory = searchParams.get("history") === "true"

  // 返回搜索历史
  if (returnHistory) {
    const history = await prisma.searchHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        query: true,
        createdAt: true,
      },
    })
    return Response.json({ data: history })
  }

  if (!query || query.trim() === "") {
    return Response.json({ error: "Query is required" }, { status: 400 })
  }

  const { page, limit, skip } = getPaginationParams(request)

  // 保存搜索历史（仅在明确要求时记录）
  if (saveHistory) {
    await saveSearchHistory(query.trim())
  }

  // 搜索消息
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: {
        authorId: session.user.id,
        content: {
          contains: query.trim(),
          mode: "insensitive",
        },
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({
      where: {
        authorId: session.user.id,
        content: { contains: query.trim(), mode: "insensitive" },
      },
    }),
  ])

  return Response.json({
    data: messages,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}
