import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

// Force Node.js runtime
export const runtime = 'nodejs'

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      createdAt: true,
    },
  })

  return Response.json({ data: user })
}

/**
 * PUT /api/auth/me
 * 更新用户资料
 */
export async function PUT(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, avatar } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        avatar: avatar || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    })

    return Response.json({ data: user })
  } catch (error) {
    return Response.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
