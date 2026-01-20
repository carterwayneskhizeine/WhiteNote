import { requireAuth, AuthError } from "@/lib/api-auth"
import { renameCommentFolder } from "@/lib/sync-utils"
import { NextRequest } from "next/server"

/**
 * POST /api/sync/rename/comment-folder
 * Rename a comment folder
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { workspaceId, commentId, newFolderName } = body

    if (!workspaceId || !commentId || !newFolderName) {
      return Response.json({ error: "workspaceId, commentId, and newFolderName are required" }, { status: 400 })
    }

    // Validate new folder name
    if (typeof newFolderName !== 'string' || newFolderName.trim().length === 0) {
      return Response.json({ error: "newFolderName must be a non-empty string" }, { status: 400 })
    }

    const success = await renameCommentFolder(workspaceId, commentId, newFolderName.trim())

    if (success) {
      return Response.json({
        success: true,
        message: `Comment folder renamed to ${newFolderName}`
      })
    } else {
      return Response.json({ error: "Failed to rename comment folder" }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to rename comment folder:", error)
    return Response.json({ error: "Failed to rename comment folder" }, { status: 500 })
  }
}
