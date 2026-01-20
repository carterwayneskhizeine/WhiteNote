import { requireAuth, AuthError } from "@/lib/api-auth"
import { renameMessageFile } from "@/lib/sync-utils"
import { NextRequest } from "next/server"

/**
 * POST /api/sync/rename/message
 * Rename a message file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { workspaceId, messageId, newFileName } = body

    if (!workspaceId || !messageId || !newFileName) {
      return Response.json({ error: "workspaceId, messageId, and newFileName are required" }, { status: 400 })
    }

    // Validate new file name
    if (typeof newFileName !== 'string' || newFileName.trim().length === 0) {
      return Response.json({ error: "newFileName must be a non-empty string" }, { status: 400 })
    }

    // Ensure .md extension
    const finalFileName = newFileName.trim().endsWith('.md')
      ? newFileName.trim()
      : `${newFileName.trim()}.md`

    const success = await renameMessageFile(workspaceId, messageId, finalFileName)

    if (success) {
      return Response.json({
        success: true,
        message: `Message file renamed to ${finalFileName}`
      })
    } else {
      return Response.json({ error: "Failed to rename message file" }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to rename message file:", error)
    return Response.json({ error: "Failed to rename message file" }, { status: 500 })
  }
}
