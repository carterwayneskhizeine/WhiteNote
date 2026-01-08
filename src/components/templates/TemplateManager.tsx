"use client"

import { useState, useEffect } from "react"
import { templatesApi } from "@/lib/api"
import { Template } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { TemplateEditDialog } from "./TemplateEditDialog"

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: "",
    description: "",
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setIsLoading(true)
    const result = await templatesApi.getTemplates()
    if (result.data) {
      setTemplates(result.data)
    }
    setIsLoading(false)
  }

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.content) return

    const result = await templatesApi.createTemplate(newTemplate)
    if (result.data) {
      setIsCreating(false)
      setNewTemplate({ name: "", content: "", description: "" })
      loadTemplates()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个模板吗？")) return

    await templatesApi.deleteTemplate(id)
    loadTemplates()
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
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
        {/* Create New Template Button */}
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="w-4 h-4 mr-2" />
          新建模板
        </Button>

        {/* Create Template Form */}
        {isCreating && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>创建新模板</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="模板名称"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
              />
              <Input
                placeholder="描述（可选）"
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, description: e.target.value })
                }
              />
              <Textarea
                placeholder="内容...（支持 Markdown）"
                value={newTemplate.content}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, content: e.target.value })
                }
                className="min-h-[120px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false)
                    setNewTemplate({ name: "", content: "", description: "" })
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newTemplate.name || !newTemplate.content}
                >
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates List */}
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {template.name}
                  {template.isBuiltIn && (
                    <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded">
                      系统
                    </span>
                  )}
                </CardTitle>
                {!template.isBuiltIn && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                )}
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                  {template.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {templates.length === 0 && !isCreating && (
          <div className="text-center py-12 text-muted-foreground">
            <p>还没有模板</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreating(true)}
            >
              创建第一个模板
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <TemplateEditDialog
        template={editingTemplate}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={loadTemplates}
      />
    </>
  )
}
