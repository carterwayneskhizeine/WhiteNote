import { auth } from "./auth"
import prisma from "./prisma"

/**
 * 获取当前登录用户 (用于 Server Components)
 */
export async function getCurrentUser() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
    },
  })

  return user
}

/**
 * 确保用户已登录 (用于 API Routes)
 * 返回用户 ID 用于数据隔离
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  return {
    userId: session.user.id,
    user: session.user,
  }
}

/**
 * API 响应：未授权
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401 }
  )
}

/**
 * 验证资源所有权
 * 确保用户只能访问自己的数据
 */
export function verifyOwnership(
  resourceAuthorId: string,
  currentUserId: string
): boolean {
  return resourceAuthorId === currentUserId
}
