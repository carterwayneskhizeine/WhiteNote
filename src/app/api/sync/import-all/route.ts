import { requireAuth, AuthError } from "@/lib/api-auth"
import { importAllFromLocal } from "@/lib/sync-utils"
import { NextRequest } from "next/server"
import redis from "@/lib/redis"

/**
 * POST /api/sync/import-all
 * Import all modified local MD files to DB and sync to RAGFlow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    // Pause file watcher to prevent feedback loop
    await redis.set("file-watcher:paused", "true", "EX", 300) // Auto-expire in 5 mins just in case

    const result = await importAllFromLocal()

    // Resume file watcher
    await redis.del("file-watcher:paused")

    return Response.json({
      data: result,
      message: `Imported ${result.imported} files, skipped ${result.skipped}, errors: ${result.errors}`
    })
  } catch (error) {
    // Ensure we resume file watcher even on error
    await redis.del("file-watcher:paused")

    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 401 })
    }
    console.error("Failed to import from local:", error)
    return Response.json({ error: "Failed to import from local files" }, { status: 500 })
  }
}
