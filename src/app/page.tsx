"use client"

import { InputMachine } from "@/components/InputMachine"
import { MessagesList } from "@/components/MessagesList"
import { NewMessageButton } from "@/components/NewMessageButton"
import { useState, useEffect } from "react"
import { useSocket } from "@/hooks/useSocket"
import { useAppStore } from "@/store/useAppStore"
import { useWorkspaceStore } from "@/store/useWorkspaceStore"
import { useSession } from "next-auth/react"
import { workspacesApi } from "@/lib/api/workspaces"
import type { Workspace } from "@/types/api"
import { ChevronDown, Loader2 } from "lucide-react"

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { setHasNewMessages } = useAppStore()
  const { data: session } = useSession()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceStore()

  // 获取当前选中的 Workspace
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  // 加载用户的 Workspace 列表
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (session?.user) {
        try {
          const result = await workspacesApi.getWorkspaces()
          if (result.data) {
            setWorkspaces(result.data)
            // 如果没有选中的 Workspace 且有默认 Workspace，自动选中
            if (!currentWorkspaceId && result.data.length > 0) {
              const defaultWorkspace = result.data.find((w) => w.isDefault) || result.data[0]
              setCurrentWorkspaceId(defaultWorkspace.id)
            }
          }
        } catch (error) {
          console.error("Failed to fetch workspaces:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchWorkspaces()
  }, [session, currentWorkspaceId])

  const handleMessageCreated = () => {
    // Trigger refresh of messages list
    setRefreshKey((prev) => prev + 1)

    // Dispatch custom event to trigger auto-refresh after 5 seconds (for AI tags)
    window.dispatchEvent(new CustomEvent('message-posted'))

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefreshFromNotification = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // 监听来自其他设备的新消息
  useSocket({
    onNewMessage: (data) => {
      setHasNewMessages(true)
    },
  })

  return (
    <div className="flex flex-col min-h-screen pt-[106px] desktop:pt-0">
      <div className="desktop:block hidden sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex w-full relative">
          {/* Workspace 下拉菜单触发器 */}
          <button
            className="flex-1 py-4 hover:bg-secondary/50 transition-colors relative flex justify-center items-center gap-2"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="font-bold text-sm">
                  {currentWorkspace?.name || '选择工作区'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
            <div className="absolute bottom-0 h-1 w-14 bg-primary rounded-full" />
          </button>

          {/* Workspace 下拉菜单 */}
          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 w-full bg-background border border-border rounded-b-lg shadow-lg z-50">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  className={`w-full px-4 py-3 text-center hover:bg-secondary/50 transition-colors ${
                    currentWorkspaceId === ws.id ? 'bg-secondary/30' : ''
                  }`}
                  onClick={() => {
                    setCurrentWorkspaceId(ws.id)
                    setShowWorkspaceMenu(false)
                    setRefreshKey((prev) => prev + 1) // 刷新消息列表
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">{ws.name}</span>
                    {ws.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">默认</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <InputMachine onSuccess={handleMessageCreated} />

      <MessagesList key={refreshKey} />

      <NewMessageButton onRefresh={handleRefreshFromNotification} />
    </div>
  )
}
