"use client"

import { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"

// 记录最近发送消息的时间戳，用于过滤自己的消息
const RECENT_MESSAGE_THRESHOLD = 5000 // 5秒内的消息视为自己发送的

let lastMessageTimestamp = 0

export function markMessageSent() {
  lastMessageTimestamp = Date.now()
}

interface SocketData {
  userId: string
  userName: string
}

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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true, // 重要：允许携带 cookies（用于认证）
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("[Socket] Connected to server:", socket.id)
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server")
      setIsConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error)
    })

    // 监听新消息事件
    socket.on("message:created", (data) => {
      console.log("[Socket] New message received:", data)

      // 过滤自己发送的消息（5秒内的消息）
      const timeSinceLastMessage = Date.now() - lastMessageTimestamp
      if (timeSinceLastMessage < RECENT_MESSAGE_THRESHOLD) {
        console.log("[Socket] Ignoring own message")
        return
      }

      onNewMessageRef.current?.(data)
    })

    // 清理函数
    return () => {
      // 只在组件卸载时断开连接
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // 空依赖数组，只在挂载时执行一次

  return {
    isConnected,
    socket: socketRef.current,
  }
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
