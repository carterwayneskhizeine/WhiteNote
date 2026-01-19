"use client"

import { Share } from "lucide-react"
import { ShareDialog } from "@/components/ShareDialog"
import { useShare, ShareType } from "@/hooks/useShare"
import { cn } from "@/lib/utils"

export interface ShareButtonProps {
  /** 要分享的 ID（帖子 ID 或评论 ID） */
  id: string
  /** 分享类型：帖子或评论 */
  type?: ShareType
  /** 按钮样式类名 */
  className?: string
  /** 是否作为按钮组的一部分（添加圆形背景） */
  asActionIcon?: boolean
}

/**
 * 统一的分享按钮组件
 * 包含按钮点击逻辑和分享对话框
 */
export function ShareButton({
  id,
  type = "message",
  className,
  asActionIcon = false,
}: ShareButtonProps) {
  const { showShareDialog, setShowShareDialog, handleShare } = useShare()

  return (
    <>
      {/* Share Button */}
      <div
        className={cn(
          "group flex items-center cursor-pointer",
          className
        )}
        onClick={() => handleShare(id)}
      >
        {asActionIcon ? (
          <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
            <Share className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </div>
        ) : (
          <Share className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        messageId={id}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        type={type}
      />
    </>
  )
}
