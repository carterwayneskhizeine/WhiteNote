import { requireAuth, AuthError } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { NextRequest } from "next/server"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/templates/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const template = await prisma.template.findUnique({
    where: { id },
  })

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 })
  }

  return Response.json({ data: template })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * PUT /api/templates/[id]
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
  const body = await request.json()

  const template = await prisma.template.findUnique({
    where: { id },
  })

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 })
  }

  if (template.isBuiltIn) {
    return Response.json({ error: "Cannot edit built-in template" }, { status: 403 })
  }

  if (template.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await prisma.template.update({
    where: { id },
    data: {
      name: body.name,
      content: body.content,
      description: body.description,
    },
  })

  return Response.json({ data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}

/**
 * DELETE /api/templates/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const template = await prisma.template.findUnique({
    where: { id },
  })

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 })
  }

  if (template.isBuiltIn) {
    return Response.json({ error: "Cannot delete built-in template" }, { status: 403 })
  }

  if (template.authorId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.template.delete({ where: { id } })

  return Response.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    throw error
  }
}
