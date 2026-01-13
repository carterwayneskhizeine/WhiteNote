"use client"

import { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"

// 为每个客户端生成唯一的会话ID
const CLIENT_SESSION_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

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

    console.log(`[Socket] Initializing client with session ID: ${CLIENT_SESSION_ID}`)

    // 创建 Socket.IO 客户端连接
    const socket = io({
      path: "/api/socket",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Cloudflare Tunnel 可能需要更多重连尝试
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: true, // 重要：允许携带 cookies（用于认证）
      // 优化 Cloudflare Tunnel 下的传输协议
      transports: ["websocket", "polling"], // 优先使用 WebSocket，降级到 polling
      // 确保 Cloudflare Tunnel 正确处理升级请求
      upgrade: true,
      // 发送客户端会话ID
      query: {
        clientId: CLIENT_SESSION_ID,
      },
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
      console.log("[Socket] Message timestamp:", data.timestamp)
      console.log("[Socket] Last message sent time:", lastMessageSentTime)
      console.log("[Socket] Time diff:", Date.now() - lastMessageSentTime)

      // 过滤自己发送的消息（使用时间戳窗口）
      const timeSinceLastMessage = Date.now() - lastMessageSentTime
      if (timeSinceLastMessage < RECENT_MESSAGE_TIMEOUT && lastMessageSentTime > 0) {
        console.log("[Socket] Ignoring own message (matched by timestamp)")
        return
      }

      console.log("[Socket] Triggering onNewMessage callback")
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

// 标记消息正在发送（在点击发送按钮时立即调用）
export function markMessageSending() {
  const now = Date.now()
  console.log(`[Socket] Marking message as sending at ${now}`)
  lastMessageSentTime = now
}

// TypeScript 类型定义
interface ServerToClientEvents {
  connect_error: (error: Error) => void
  "message:created": (data: { messageId: string; timestamp: number; senderClientId?: string }) => void
  disconnect: () => void
  connect: () => void
}

interface ClientToServerEvents {
  // 客户端发送的事件（如果需要的话）
}
