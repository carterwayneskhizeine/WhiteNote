"use client"

import { useState, useEffect } from "react"
import { aiCommandsApi } from "@/lib/api"
import { AICommand } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Sparkles } from "lucide-react"
import { AICommandEditDialog } from "./AICommandEditDialog"

export function AICommandManager() {
  const [commands, setCommands] = useState<AICommand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingCommand, setEditingCommand] = useState<AICommand | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newCommand, setNewCommand] = useState({
    label: "",
    description: "",
    action: "",
    prompt: "",
  })

  useEffect(() => {
    loadCommands()
  }, [])

  const loadCommands = async () => {
    setIsLoading(true)
    const result = await aiCommandsApi.getCommands()
    if (result.data) {
      setCommands(result.data)
    }
    setIsLoading(false)
  }

  const handleCreate = async () => {
    if (!newCommand.label || !newCommand.description || !newCommand.action || !newCommand.prompt) {
      return
    }

    const result = await aiCommandsApi.createCommand(newCommand)
    if (result.data) {
      setIsCreating(false)
      setNewCommand({ label: "", description: "", action: "", prompt: "" })
      loadCommands()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个AI命令吗？")) return

    await aiCommandsApi.deleteCommand(id)
    loadCommands()
  }

  const handleEdit = (command: AICommand) => {
    setEditingCommand(command)
    setIsEditDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Create New Command Button */}
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="w-4 h-4 mr-2" />
          新建命令
        </Button>

        {/* Create Command Form */}
        {isCreating && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>创建新AI命令</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>
                  标签 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="例如：总结"
                  value={newCommand.label}
                  onChange={(e) =>
                    setNewCommand({ ...newCommand, label: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  描述 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="例如：总结内容的要点"
                  value={newCommand.description}
                  onChange={(e) =>
                    setNewCommand({ ...newCommand, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  动作标识 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="例如：summarize"
                  value={newCommand.action}
                  onChange={(e) =>
                    setNewCommand({ ...newCommand, action: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  唯一标识符，只能包含小写字母、数字和连字符
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  提示词模板 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="请输入提示词模板，{content} 会被替换为用户输入的内容"
                  value={newCommand.prompt}
                  onChange={(e) =>
                    setNewCommand({ ...newCommand, prompt: e.target.value })
                  }
                  className="min-h-[120px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  使用 {'{{content}}'} 作为占位符，它将被替换为用户输入的实际内容
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false)
                    setNewCommand({ label: "", description: "", action: "", prompt: "" })
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !newCommand.label ||
                    !newCommand.description ||
                    !newCommand.action ||
                    !newCommand.prompt
                  }
                >
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commands List */}
        <div className="space-y-3">
          {commands.map((command) => (
            <Card key={command.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {command.label}
                  {command.isBuiltIn && (
                    <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded">
                      系统
                    </span>
                  )}
                </CardTitle>
                {!command.isBuiltIn && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(command)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(command.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {command.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">动作:</span>
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">
                      {command.action}
                    </code>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground text-sm">提示词:</span>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {command.prompt}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {commands.length === 0 && !isCreating && (
          <div className="text-center py-12 text-muted-foreground">
            <p>还没有AI命令</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreating(true)}
            >
              创建第一个命令
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <AICommandEditDialog
        command={editingCommand}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={loadCommands}
      />
    </>
  )
}
