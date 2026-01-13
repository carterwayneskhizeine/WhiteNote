"use client"

import { useState, useEffect } from "react"
import { aiCommandsApi } from "@/lib/api"
import { AICommand } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface AICommandEditDialogProps {
  command: AICommand | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AICommandEditDialog({
  command,
  open,
  onOpenChange,
  onSuccess,
}: AICommandEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    prompt: "",
  })

  useEffect(() => {
    if (command) {
      setFormData({
        label: command.label,
        description: command.description,
        prompt: command.prompt,
      })
    } else {
      setFormData({
        label: "",
        description: "",
        prompt: "",
      })
    }
  }, [command])

  const handleSubmit = async () => {
    if (!command || !formData.label || !formData.description || !formData.prompt) {
      return
    }

    setIsLoading(true)
    try {
      await aiCommandsApi.updateCommand(command.id, formData)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update AI command:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑 AI 命令</DialogTitle>
          <DialogDescription>
            修改您的自定义 AI 命令配置
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-label">
              标签 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-label"
              placeholder="例如：总结"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">
              描述 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-description"
              placeholder="例如：总结内容的要点"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-prompt">
              提示词模板 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-prompt"
              placeholder="请输入提示词模板，{content} 会被替换为用户输入的内容"
              value={formData.prompt}
              onChange={(e) =>
                setFormData({ ...formData, prompt: e.target.value })
              }
              className="min-h-[120px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              使用 {'{content}'} 作为占位符，它将被替换为用户输入的实际内容
            </p>
          </div>

          <div className="space-y-2">
            <Label>动作标识</Label>
            <Input
              value={command?.action || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              动作标识不可修改
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !formData.label ||
              !formData.description ||
              !formData.prompt
            }
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
