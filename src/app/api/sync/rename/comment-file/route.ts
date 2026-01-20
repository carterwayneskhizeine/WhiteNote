import { requireAuth, AuthError } from "@/lib/api-auth"
import { renameCommentFile } from "@/lib/sync-utils"
import { NextRequest } from "next/server"

/**
 * POST /api/sync/rename/comment-file
 * Rename a comment file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { workspaceId, commentId, newFileName } = body

    if (!workspaceId || !commentId || !newFileName) {
      return Response.json({ error: "workspaceId, commentId, and newFileName are required" }, { status: 400 })
    }

    // Validate new file name
    if (typeof newFileName !== 'string' || newFileName.trim().length === 0) {
      return Response.json({ error: "newFileName must be a non-empty string" }, { status: 400 })
    }

    // Ensure .md extension
    const finalFileName = newFileName.trim().endsWith('.md')
      ? newFileName.trim()
      : `${newFileName.trim()}.md`

    const success = await renameCommentFile(workspaceId, commentId, finalFileName)

    if (success) {
      return Response.json({
        success: true,
        message: `Comment file renamed to ${finalFileName}`
      })
    } else {
      return Response.json({ error: "Failed to rename comment file" }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to rename comment file:", error)
    return Response.json({ error: "Failed to rename comment file" }, { status: 500 })
  }
}
