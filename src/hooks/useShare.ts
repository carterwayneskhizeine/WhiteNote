import { useState, useCallback } from "react"

export type ShareType = 'message' | 'comment'

export interface UseShareReturn {
  showShareDialog: boolean
  setShowShareDialog: (open: boolean) => void
  shareItemId: string | null
  handleShare: (id: string) => void
  handleShareWithEvent: (id: string, e: React.MouseEvent) => void
}

/**
 * 统一的分享功能 Hook
 * 用于管理分享对话框的状态和逻辑
 */
export function useShare(): UseShareReturn {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareItemId, setShareItemId] = useState<string | null>(null)

  // 打开分享对话框
  const handleShare = useCallback((id: string) => {
    setShareItemId(id)
    setShowShareDialog(true)
  }, [])

  // 带事件的版本（用于阻止事件冒泡）
  const handleShareWithEvent = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    handleShare(id)
  }, [handleShare])

  return {
    showShareDialog,
    setShowShareDialog,
    shareItemId,
    handleShare,
    handleShareWithEvent,
  }
}
