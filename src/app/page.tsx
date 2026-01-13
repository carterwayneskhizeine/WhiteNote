"use client"

import { InputMachine } from "@/components/InputMachine"
import { MessagesList } from "@/components/MessagesList"
import { NewMessageButton } from "@/components/NewMessageButton"
import { useState } from "react"
import { useSocket } from "@/hooks/useSocket"
import { useAppStore } from "@/store/useAppStore"
import { useSession } from "next-auth/react"

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { setHasNewMessages } = useAppStore()
  const { data: session } = useSession()

  const handleMessageCreated = () => {
    // Trigger refresh of messages list
    setRefreshKey((prev) => prev + 1)

    // Dispatch custom event to trigger auto-refresh after 5 seconds (for AI tags)
    window.dispatchEvent(new CustomEvent('message-posted'))
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
        <div className="flex w-full">
          <button className="flex-1 py-4 hover:bg-secondary/50 transition-colors relative flex justify-center items-center">
            <span className="font-bold text-sm">For you</span>
            <div className="absolute bottom-0 h-1 w-14 bg-primary rounded-full" />
          </button>
          <button className="flex-1 py-4 hover:bg-secondary/50 transition-colors flex justify-center items-center">
            <span className="font-medium text-sm text-muted-foreground">Following</span>
          </button>
        </div>
      </div>

      <InputMachine onSuccess={handleMessageCreated} />

      <MessagesList key={refreshKey} />

      <NewMessageButton onRefresh={handleRefreshFromNotification} />
    </div>
  )
}
