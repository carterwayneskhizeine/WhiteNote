"use client"

import { useState, useEffect } from "react"
import { MessageCard } from "@/components/MessageCard"
import { Message, messagesApi } from "@/lib/api/messages"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MessagesListProps {
  filters?: {
    tagId?: string
    isStarred?: boolean
    isPinned?: boolean
    rootOnly?: boolean
  }
}

export function MessagesList({ filters }: MessagesListProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const result = await messagesApi.getMessages({
        ...filters,
        rootOnly: true, // Only show root messages on timeline
      })

      if (result.error) {
        setError(result.error)
      } else {
        setMessages(result.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err)
      setError("Failed to load messages")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [filters])

  const handleRefresh = () => {
    fetchMessages(false)
  }

  const handleMessageUpdate = () => {
    // Refresh messages when a message is updated
    fetchMessages(false)
  }

  const handleMessageDelete = (deletedId: string) => {
    // Remove deleted message from state
    setMessages((prev) => prev.filter((m) => m.id !== deletedId))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
                <div className="h-16 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={() => fetchMessages()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </Button>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-2">还没有消息</p>
        <p className="text-sm text-muted-foreground">
          发布你的第一条消息吧！
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Refresh button */}
      <div className="flex justify-end p-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* Messages */}
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          onUpdate={handleMessageUpdate}
          onDelete={handleMessageDelete}
        />
      ))}
    </div>
  )
}
