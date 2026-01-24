# File-Based Workspace and Message Creation Implementation Guide

## Overview

This document describes how to implement a file system monitoring feature that allows creating workspaces and messages by creating markdown files in the `D:\Code\whitenote-data\link_md` directory. This feature enables users to create content through their file system while maintaining all existing system functionality.

## Current System Architecture

### Existing Sync System

The codebase already has a sophisticated bidirectional sync system (`src/lib/sync-utils.ts`) that:

1. **Exports** messages from database to local markdown files
2. **Imports** changes from local files back to database
3. **Tracks** metadata in `.whitenote/workspace.json` files
4. **Supports** manually renamed files and folders

### Current File Structure

```
D:\Code\whitenote-data\link_md\
├── {workspaceId}\
│   ├── {message-filename}.md          # Message files
│   ├── {comment-folder}\
│   │   └── {comment-filename}.md      # Comment files
│   └── .whitenote\
│       └── workspace.json            # Metadata tracking
```

### Markdown File Format

```markdown
#tag1 #tag2 #tag3

Message content goes here...

Multi-line content is supported.
```

First line contains tags (optional), remaining lines are the content.

## What's Missing

The current system works well for **existing** workspaces and messages, but it doesn't:

1. **Detect new folders** to create workspaces
2. **Detect new .md files** to create messages
3. **Monitor file system** for changes automatically

## Implementation Design

### Architecture Overview

We need to implement a **file watcher service** that:

1. Monitors `D:\Code\whitenote-data\link_md` for changes
2. Detects new folders → Creates workspaces
3. Detects new .md files → Creates messages
4. Integrates with existing queue system for processing

### Components to Implement

```
┌─────────────────────────────────────────────────────────────┐
│  File Watcher Service (New)                                 │
│  - Monitors link_md directory                               │
│  - Detects new folders and files                            │
│  - Queues creation tasks                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  BullMQ Queue (Existing)                                    │
│  - New job type: "create-workspace-from-folder"            │
│  - New job type: "create-message-from-file"                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Queue Processors (New)                                     │
│  - processCreateWorkspaceFromFolder                         │
│  - processCreateMessageFromFile                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (Existing)                                        │
│  - Creates Workspace records                                │
│  - Creates Message records                                  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create File Watcher Service

Create file: `src/lib/file-watcher/index.ts`

```typescript
import * as fs from "fs"
import * as path from "path"
import { addTask } from "@/lib/queue"

const WATCH_DIR = "D:\\Code\\whitenote-data\\link_md"
const DEBOUNCE_DELAY = 1000 // 1 second

// Track processed files to avoid duplicates
const processedFiles = new Set<string>()
const processedFolders = new Set<string>()

let watchTimeout: NodeJS.Timeout | null = null

export function startFileWatcher() {
  console.log(`[FileWatcher] Starting file watcher for: ${WATCH_DIR}`)

  // Ensure directory exists
  if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true })
  }

  // Initial scan
  scanDirectory()

  // Watch for changes
  const watcher = fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return

    // Debounce rapid file changes
    if (watchTimeout) {
      clearTimeout(watchTimeout)
    }

    watchTimeout = setTimeout(() => {
      console.log(`[FileWatcher] Detected change: ${filename}`)
      scanDirectory()
    }, DEBOUNCE_DELAY)
  })

  return watcher
}

function scanDirectory() {
  if (!fs.existsSync(WATCH_DIR)) {
    return
  }

  const dirs = fs.readdirSync(WATCH_DIR, { withFileTypes: true })

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue

    const folderPath = path.join(WATCH_DIR, dir.name)
    const workspaceFile = path.join(folderPath, ".whitenote", "workspace.json")

    // Check if this is a new workspace folder (no workspace.json yet)
    if (!fs.existsSync(workspaceFile)) {
      // New workspace folder detected
      if (!processedFolders.has(folderPath)) {
        console.log(`[FileWatcher] New workspace folder detected: ${dir.name}`)
        processedFolders.add(folderPath)

        // Queue workspace creation
        addTask("create-workspace-from-folder", {
          folderName: dir.name,
          folderPath
        }).catch(console.error)
      }
    } else {
      // Existing workspace - scan for new message files
      scanWorkspaceFolder(folderPath, dir.name)
    }
  }
}

function scanWorkspaceFolder(workspacePath: string, workspaceId: string) {
  try {
    const files = fs.readdirSync(workspacePath, { withFileTypes: true })
    const workspaceFile = path.join(workspacePath, ".whitenote", "workspace.json")

    if (!fs.existsSync(workspaceFile)) {
      return
    }

    const ws = JSON.parse(fs.readFileSync(workspaceFile, "utf-8"))
    const trackedFiles = new Set(
      Object.values(ws.messages || {})
        .map((m: any) => m.currentFilename)
        .concat(Object.values(ws.comments || {}).map((c: any) => c.currentFilename))
    )

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.md')) continue

      const filePath = path.join(workspacePath, file.name)
      const fileKey = `${workspaceId}:${file.name}`

      // Skip if already tracked or processed
      if (trackedFiles.has(file.name) || processedFiles.has(fileKey)) {
        continue
      }

      console.log(`[FileWatcher] New message file detected: ${file.name} in workspace ${workspaceId}`)
      processedFiles.add(fileKey)

      // Queue message creation
      addTask("create-message-from-file", {
        workspaceId,
        filePath,
        filename: file.name
      }).catch(console.error)
    }
  } catch (error) {
    console.error(`[FileWatcher] Error scanning workspace folder:`, error)
  }
}
```

### Step 2: Update Queue Types

Update file: `src/lib/queue/index.ts`

```typescript
// Add new job types
export type JobType =
  | "auto-tag"
  | "auto-tag-comment"
  | "sync-ragflow"
  | "daily-briefing"
  | "sync-to-local"
  | "create-workspace-from-folder"
  | "create-message-from-file"
```

### Step 3: Create Workspace Processor

Create file: `src/lib/queue/processors/create-workspace-from-folder.ts`

```typescript
import { Job } from "bullmq"
import prisma from "@/lib/prisma"
import { provisionRAGFlowForWorkspace } from "@/lib/ragflow/provision"
import { getAiConfig } from "@/lib/ai/config"
import * as fs from "fs"
import * as path from "path"

interface CreateWorkspaceFromFolderJobData {
  folderName: string
  folderPath: string
}

export async function processCreateWorkspaceFromFolder(
  job: Job<CreateWorkspaceFromFolderJobData>
) {
  const { folderName, folderPath } = job.data

  console.log(`[CreateWorkspace] Processing folder: ${folderName}`)

  // Get the first user (or use a config setting for default user)
  const user = await prisma.user.findFirst({
    where: { email: process.env.DEFAULT_USER_EMAIL || "user@example.com" }
  })

  if (!user) {
    throw new Error("No user found to create workspace")
  }

  // Check if workspace already exists
  const existingWorkspace = await prisma.workspace.findFirst({
    where: {
      userId: user.id,
      name: folderName
    }
  })

  if (existingWorkspace) {
    console.log(`[CreateWorkspace] Workspace already exists: ${folderName}`)
    return
  }

  // Get RAGFlow config
  const config = await getAiConfig(user.id)

  if (!config.ragflowBaseUrl || !config.ragflowApiKey) {
    throw new Error("RAGFlow not configured")
  }

  // Create RAGFlow resources
  const { datasetId, chatId } = await provisionRAGFlowForWorkspace(
    config.ragflowBaseUrl,
    config.ragflowApiKey,
    folderName,
    user.id
  )

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: folderName,
      userId: user.id,
      ragflowDatasetId: datasetId,
      ragflowChatId: chatId,
      isDefault: false
    }
  })

  // Create workspace.json metadata file
  const metaDir = path.join(folderPath, ".whitenote")
  fs.mkdirSync(metaDir, { recursive: true })

  const workspaceData = {
    version: 2,
    workspace: {
      id: workspace.id,
      originalFolderName: folderName,
      currentFolderName: folderName,
      name: folderName,
      lastSyncedAt: new Date().toISOString()
    },
    messages: {},
    comments: {}
  }

  fs.writeFileSync(
    path.join(metaDir, "workspace.json"),
    JSON.stringify(workspaceData, null, 2)
  )

  console.log(`[CreateWorkspace] Created workspace: ${workspace.id} (${folderName})`)

  return workspace
}
```

### Step 4: Create Message Processor

Create file: `src/lib/queue/processors/create-message-from-file.ts`

```typescript
import { Job } from "bullmq"
import prisma from "@/lib/prisma"
import { parseMdFile } from "@/lib/sync-utils"
import { batchUpsertTags } from "@/lib/tag-utils"
import { addTask } from "@/lib/queue"

interface CreateMessageFromFileJobData {
  workspaceId: string
  filePath: string
  filename: string
}

export async function processCreateMessageFromFile(
  job: Job<CreateMessageFromFileJobData>
) {
  const { workspaceId, filePath, filename } = job.data

  console.log(`[CreateMessage] Processing file: ${filename} in workspace ${workspaceId}`)

  // Read file content
  const fs = await import("fs")
  const contentRaw = fs.readFileSync(filePath, "utf-8")
  const { tags, content } = parseMdFile(contentRaw)

  if (!content || content.trim().length === 0) {
    console.log(`[CreateMessage] Empty content, skipping: ${filename}`)
    return
  }

  // Get workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { user: true }
  })

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  // Check if message already exists (by matching content and time)
  const existingMessage = await prisma.message.findFirst({
    where: {
      workspaceId,
      content,
      authorId: workspace.user.id
    }
  })

  if (existingMessage) {
    console.log(`[CreateMessage] Message already exists, updating metadata`)
    // Update workspace.json to mark as tracked
    await updateWorkspaceMetadata(workspaceId, existingMessage.id, filename)
    return existingMessage
  }

  // Create tags
  const tagIds = tags.length > 0 ? await batchUpsertTags(tags) : []

  // Create message
  const message = await prisma.message.create({
    data: {
      content,
      authorId: workspace.user.id,
      workspaceId,
      tags: tagIds.length > 0
        ? {
            create: tagIds.map((tagId) => ({ tagId }))
          }
        : undefined
    }
  })

  // Update workspace.json to track this file
  await updateWorkspaceMetadata(workspaceId, message.id, filename)

  // Trigger AI tagging if enabled
  if (workspace.enableAutoTag) {
    await addTask("auto-tag", {
      userId: workspace.user.id,
      workspaceId,
      messageId: message.id
    })
  } else {
    // Sync to RAGFlow
    await addTask("sync-ragflow", {
      userId: workspace.user.id,
      workspaceId,
      messageId: message.id,
      contentType: "message"
    })
  }

  console.log(`[CreateMessage] Created message: ${message.id}`)

  return message
}

async function updateWorkspaceMetadata(
  workspaceId: string,
  messageId: string,
  filename: string
) {
  const fs = await import("fs")
  const path = await import("path")
  const syncUtils = await import("@/lib/sync-utils")

  const { getWorkspaceData, getWorkspaceDir, saveWorkspaceData, generateFriendlyName } = syncUtils

  const workspaceDir = getWorkspaceDir(workspaceId)
  const workspaceFile = path.join(workspaceDir, ".whitenote", "workspace.json")

  if (!fs.existsSync(workspaceFile)) {
    return
  }

  const ws = getWorkspaceData(workspaceId) as any
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { author: true, tags: { include: { tag: true } } }
  })

  if (!message) return

  const originalFilename = `message_${messageId}.md`
  const friendlyName = generateFriendlyName(message.content)
  const currentFilename = filename // Use the actual filename

  const tagString = message.tags.map((t: any) => `#${t.tag.name}`).join(" ")

  ws.messages[originalFilename] = {
    id: messageId,
    type: "message",
    originalFilename,
    currentFilename,
    commentFolderName: originalFilename.replace('.md', ''),
    created_at: message.createdAt.toISOString(),
    updated_at: new Date().toISOString(),
    author: message.author?.email || "unknown",
    authorName: message.author?.name || "Unknown",
    tags: tagString
  }

  ws.workspace.lastSyncedAt = new Date().toISOString()

  saveWorkspaceData(workspaceId, ws)
}
```

### Step 5: Update Worker

Update file: `src/lib/queue/worker.ts`

```typescript
import { processCreateWorkspaceFromFolder } from "./processors/create-workspace-from-folder"
import { processCreateMessageFromFile } from "./processors/create-message-from-file"

export function startWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      console.log(`[Worker] Processing job: ${job.name} (${job.id})`)

      switch (job.name) {
        case "auto-tag":
          await processAutoTag(job)
          break
        case "auto-tag-comment":
          await processAutoTagExtended(job)
          break
        case "sync-ragflow":
          await processSyncRAGFlow(job)
          break
        case "daily-briefing":
          await processDailyBriefing(job)
          break
        case "sync-to-local":
          await processSyncToLocal(job)
          break
        case "create-workspace-from-folder":
          await processCreateWorkspaceFromFolder(job)
          break
        case "create-message-from-file":
          await processCreateMessageFromFile(job)
          break
        default:
          console.warn(`[Worker] Unknown job type: ${job.name}`)
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  )

  // ... rest of the code
}
```

### Step 6: Start File Watcher in Worker

Update file: `scripts/worker.ts`

```typescript
import "dotenv/config"
import { startWorker } from "@/lib/queue/worker"
import { addCronTask } from "@/lib/queue"
import { startFileWatcher } from "@/lib/file-watcher"

async function main() {
  console.log("Starting WhiteNote Worker...")

  // 启动 Worker
  const worker = startWorker()

  // 启动文件监听器
  const fileWatcher = startFileWatcher()
  console.log("File watcher started")

  // 注册每日晨报定时任务 (每天早上 8:00)
  await addCronTask("daily-briefing", {}, "0 8 * * *")
  console.log("Registered daily briefing cron job (every day at 08:00)")

  // 优雅退出
  process.on("SIGTERM", async () => {
    console.log("Shutting down worker...")
    await worker.close()
    if (fileWatcher) {
      fileWatcher.close()
    }
    process.exit(0)
  })

  console.log("Worker is running. Press Ctrl+C to exit.")
}

main().catch(console.error)
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# File watcher configuration
FILE_WATCHER_ENABLED=true
FILE_WATCHER_DIR=D:\Code\whitenote-data\link_md
DEFAULT_USER_EMAIL=your-email@example.com
```

### AI Config

The system uses existing RAGFlow configuration from `AiConfig` table. Make sure the user has RAGFlow configured before creating workspaces.

## Usage Workflow

### Creating a New Workspace

1. Create a new folder in `D:\Code\whitenote-data\link_md`:
   ```
   D:\Code\whitenote-data\link_md\My-New-Workspace\
   ```

2. The file watcher detects the new folder within 1 second
3. Worker creates the workspace and RAGFlow resources
4. `.whitenote/workspace.json` is created with metadata

### Creating a New Message

1. Create a new `.md` file in an existing workspace folder:
   ```
   D:\Code\whitenote-data\link_md\My-New-Workspace\my-post.md
   ```

2. File content:
   ```markdown
   #productivity #tips

   Today I learned about the Pomodoro technique...
   ```

3. The file watcher detects the new file within 1 second
4. Worker creates the message in the database
5. Message is tagged and synced to RAGFlow
6. `.whitenote/workspace.json` is updated to track the file

### Bidirectional Sync

After creation:
- **Editing the file** → Updates the database message (existing import function)
- **Editing in the app** → Updates the file (existing export function)
- **Deleting the file** → Marks message as deleted (optional, not implemented)

## Testing

### Manual Testing

```bash
# 1. Start all services
pnpm build
pnpm dev        # Terminal 1
pnpm worker     # Terminal 2

# 2. Create test workspace folder
mkdir "D:\Code\whitenote-data\link_md\Test-Workspace"

# 3. Check worker logs for:
#    - [FileWatcher] New workspace folder detected
#    - [CreateWorkspace] Created workspace: xxx

# 4. Create test message file
echo "#test\n\nHello from file system!" > "D:\Code\whitenote-data\link_md\Test-Workspace\hello.md"

# 5. Check worker logs for:
#    - [FileWatcher] New message file detected
#    - [CreateMessage] Created message: xxx

# 6. Check database:
#    - pnpm prisma studio
#    - Verify workspace and message exist
```

### Integration Testing

Create file: `src/__tests__/file-watcher.test.ts`

```typescript
import fs from "fs"
import path from "path"
import { startFileWatcher } from "@/lib/file-watcher"
import prisma from "@/lib/prisma"

describe("File Watcher", () => {
  const testDir = "D:\\Code\\whitenote-data\\link_md\\test-workspace"

  beforeAll(async () => {
    // Clean up test data
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  it("should detect new workspace folder", async () => {
    // Create folder
    fs.mkdirSync(testDir, { recursive: true })

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Verify workspace in database
    const workspace = await prisma.workspace.findFirst({
      where: { name: "test-workspace" }
    })

    expect(workspace).toBeDefined()
  }, 10000)

  it("should detect new message file", async () => {
    // Create file
    const filePath = path.join(testDir, "test-message.md")
    fs.writeFileSync(filePath, "#test\n\nTest content")

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Verify message in database
    const message = await prisma.message.findFirst({
      where: { content: "Test content" }
    })

    expect(message).toBeDefined()
  }, 10000)
})
```

## Error Handling

### Common Issues

1. **RAGFlow not configured**
   - Error: "RAGFlow not configured"
   - Solution: Configure RAGFlow in user's AI settings

2. **No user found**
   - Error: "No user found to create workspace"
   - Solution: Set `DEFAULT_USER_EMAIL` in `.env`

3. **Permission denied**
   - Error: EPERM when creating files
   - Solution: Check file system permissions

### Retry Logic

The BullMQ queue automatically retries failed jobs (3 attempts by default). Check worker logs for failed jobs.

## Performance Considerations

1. **Debouncing**: File changes are debounced by 1 second to avoid processing rapid changes
2. **Concurrency**: Worker processes 5 jobs concurrently
3. **Deduplication**: Processed files/folders are tracked to avoid duplicates

## Future Enhancements

1. **Comment support**: Detect and create comments from nested folder structure
2. **Media support**: Detect and process attached media files
3. **Delete handling**: Handle file deletion by marking messages as deleted
4. **Real-time notifications**: Notify users via Socket.IO when files are processed
5. **Conflict resolution**: Handle conflicts when file and database are edited simultaneously
6. **Selective sync**: Allow users to exclude certain files/folders from sync

## Maintenance

### Monitoring

Check worker logs for:
```
[FileWatcher] Detected change: ...
[CreateWorkspace] Created workspace: ...
[CreateMessage] Created message: ...
```

### Troubleshooting

If files are not being processed:
1. Check that worker is running
2. Verify `FILE_WATCHER_ENABLED=true` in `.env`
3. Check file system permissions
4. Review worker error logs

## Related Files

- `src/lib/sync-utils.ts` - Existing bidirectional sync logic
- `src/lib/queue/worker.ts` - Queue worker
- `src/lib/queue/index.ts` - Queue types and helpers
- `prisma/schema.prisma` - Database schema
- `scripts/worker.ts` - Worker entry point
