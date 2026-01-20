import { requireAuth, AuthError } from "@/lib/api-auth"
import { renameWorkspaceFolder } from "@/lib/sync-utils"
import { NextRequest } from "next/server"

/**
 * POST /api/sync/rename/workspace
 * Rename a workspace folder
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { workspaceId, newFolderName } = body

    if (!workspaceId || !newFolderName) {
      return Response.json({ error: "workspaceId and newFolderName are required" }, { status: 400 })
    }

    // Validate new folder name
    if (typeof newFolderName !== 'string' || newFolderName.trim().length === 0) {
      return Response.json({ error: "newFolderName must be a non-empty string" }, { status: 400 })
    }

    const success = await renameWorkspaceFolder(workspaceId, newFolderName.trim())

    if (success) {
      return Response.json({
        success: true,
        message: `Workspace folder renamed to ${newFolderName}`
      })
    } else {
      return Response.json({ error: "Failed to rename workspace folder" }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to rename workspace folder:", error)
    return Response.json({ error: "Failed to rename workspace folder" }, { status: 500 })
  }
}
