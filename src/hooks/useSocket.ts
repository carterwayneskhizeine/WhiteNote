"use client"

import { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"

// 记录这个会话最近发送的时间戳（用于过滤）
let lastMessageSentTime = 0
const RECENT_MESSAGE_TIMEOUT = 10000 // 10秒内的消息视为自己发送的

interface UseSocketOptions {
  onNewMessage?: (data: { messageId: string; timestamp: number }) => void
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const onNewMessageRef = useRef(options.onNewMessage)

  // 使用 ref 避免依赖变化导致重新连接
  useEffect(() => {
    onNewMessageRef.current = options.onNewMessage
  }, [options.onNewMessage])

  useEffect(() => {
    // 防止重复创建连接
    if (socketRef.current?.connected) {
      return
    }

    // 创建 Socket.IO 客户端连接
    const socket = io({
      path: "/api/socket",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true,
      transports: ["websocket", "polling"],
      upgrade: true,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error)
    })

    // 监听新消息事件
    socket.on("message:created", (data) => {
      // 过滤自己发送的消息（使用时间戳窗口）
      const timeSinceLastMessage = Date.now() - lastMessageSentTime
      if (timeSinceLastMessage < RECENT_MESSAGE_TIMEOUT && lastMessageSentTime > 0) {
        return
      }

      onNewMessageRef.current?.(data)
    })

    // 清理函数
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // 空依赖数组，只在挂载时执行一次

  return {
    isConnected,
    socket: socketRef.current,
  }
}

// 标记消息正在发送（在点击发送按钮时立即调用）
export function markMessageSending() {
  lastMessageSentTime = Date.now()
}

// TypeScript 类型定义
interface ServerToClientEvents {
  connect_error: (error: Error) => void
  "message:created": (data: { messageId: string; timestamp: number }) => void
  disconnect: () => void
  connect: () => void
}

interface ClientToServerEvents {
  // 客户端发送的事件（如果需要的话）
}
