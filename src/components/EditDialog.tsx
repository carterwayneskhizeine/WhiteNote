"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TipTapEditor } from "@/components/TipTapEditor"
import { Loader2 } from "lucide-react"

interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialContent: string
  onSave: (content: string) => Promise<void>
  title?: string
}

export function EditDialog({
  open,
  onOpenChange,
  initialContent,
  onSave,
  title = "编辑消息"
}: EditDialogProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)

  // Update content when initialContent changes (when dialog opens with new content)
  useEffect(() => {
    if (open) {
      setContent(initialContent)
    }
  }, [open, initialContent])

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      await onSave(content)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    // Esc to close
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-4">
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder="编辑消息内容..."
            className="mx-4"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || content.trim() === initialContent.trim()}
            className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
