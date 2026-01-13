"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { useEffect } from "react"

interface NewMessageButtonProps {
  onRefresh: () => void
}

export function NewMessageButton({ onRefresh }: NewMessageButtonProps) {
  const { hasNewMessages, acknowledgeNewMessages } = useAppStore()

  useEffect(() => {
    console.log("[NewMessageButton] hasNewMessages:", hasNewMessages)
  }, [hasNewMessages])

  if (!hasNewMessages) {
    console.log("[NewMessageButton] Not showing button (hasNewMessages is false)")
    return null
  }

  console.log("[NewMessageButton] Rendering button!")

  const handleClick = () => {
    console.log("[NewMessageButton] Button clicked!")
    acknowledgeNewMessages()
    onRefresh()
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button
        onClick={handleClick}
        size="lg"
        className="shadow-lg rounded-full gap-2 px-6 animate-bounce"
      >
        <RefreshCw className="h-4 w-4" />
        <span>有新消息</span>
      </Button>
    </div>
  )
}
