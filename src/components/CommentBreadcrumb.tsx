"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface CommentBreadcrumbProps {
  parentId?: string | null
  onNavigateBack: (targetId: string) => void
  onNavigateToMessage: () => void
  onNavigateHome: () => void
}

export function CommentBreadcrumb({ parentId, onNavigateBack, onNavigateToMessage, onNavigateHome }: CommentBreadcrumbProps) {
  const handleBack = () => {
    if (parentId) {
      // 返回到父评论页
      onNavigateBack(parentId)
    } else {
      // 顶级评论：返回到帖子详情页
      onNavigateToMessage()
    }
  }

  return (
    <div className="flex items-center px-4 h-[53px]">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={handleBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* 标题 */}
      <h1 className="text-xl font-bold">帖子</h1>
    </div>
  )
}
