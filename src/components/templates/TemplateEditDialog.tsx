"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { templatesApi } from "@/lib/api"
import { Template } from "@/types/api"

interface TemplateEditDialogProps {
  template: Template | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function TemplateEditDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: TemplateEditDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || "")
      setContent(template.content)
      setError("")
    }
  }, [template])

  const handleSave = async () => {
    if (!template || !name.trim() || !content.trim()) {
      setError("名称和内容不能为空")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const result = await templatesApi.updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err) {
      setError("保存失败，请重试")
      console.error("Failed to update template:", err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑模板</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              模板名称 <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-name"
              placeholder="例如：每日晨报"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              描述（可选）
            </label>
            <Input
              id="edit-description"
              placeholder="简短描述这个模板的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-content" className="text-sm font-medium">
              模板内容 <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="edit-content"
              placeholder="## 今日计划&#10;- [ ] 任务1&#10;- [ ] 任务2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              支持 Markdown 格式
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !content.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
