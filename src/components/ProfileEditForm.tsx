"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authApi } from "@/lib/api"
import { Loader2, Upload } from "lucide-react"

export function ProfileEditForm() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [initializing, setInitializing] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState("")

  // Initialize form with current user data
  useEffect(() => {
    const loadUserData = async () => {
      // First try to get from API for fresh data
      const result = await authApi.getCurrentUser()
      if (result.data) {
        setName(result.data.name || "")
        setAvatar(result.data.avatar || "")
      } else if (session?.user) {
        // Fallback to session data
        setName(session.user.name || "")
        setAvatar(session.user.image || "")
      }
      setInitializing(false)
    }

    loadUserData()
  }, [session])

  const userInitials = name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CN"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const updateData: { name?: string; avatar?: string } = {}
    const newName = name.trim()
    const newAvatar = avatar.trim()

    // Always send the data to backend for comparison
    if (newName) {
      updateData.name = newName
    }

    // Send avatar even if empty (to clear it)
    updateData.avatar = newAvatar

    const result = await authApi.updateProfile(updateData)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
      setLoading(false)
    } else {
      setMessage({ type: "success", text: "资料更新成功" })

      // Update the form state with the new values
      setName(result.data?.name || newName)
      setAvatar(result.data?.avatar || newAvatar)

      // Update NextAuth session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: result.data?.name || newName,
          image: result.data?.avatar || newAvatar || null,
        },
      })

      setLoading(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }
  }

  const handleCancel = async () => {
    // Reload from API
    const result = await authApi.getCurrentUser()
    if (result.data) {
      setName(result.data.name || "")
      setAvatar(result.data.avatar || "")
    }
    setMessage(null)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "只支持 JPG、PNG、WebP、GIF 格式的图片" })
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ type: "error", text: "图片大小不能超过 5MB" })
      return
    }

    setUploading(true)
    setMessage(null)

    const result = await authApi.uploadAvatar(file)

    if (result.error) {
      setMessage({ type: "error", text: result.error })
      setUploading(false)
    } else if (result.data?.url) {
      // Update avatar URL with the uploaded file URL
      setAvatar(result.data.url)
      setMessage({ type: "success", text: "图片上传成功" })
      setUploading(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (initializing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Preview */}
      <Card>
        <CardHeader>
          <CardTitle>头像预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {avatar && <AvatarImage src={avatar} className="object-cover" />}
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                头像会显示在你的个人资料和消息旁边
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      上传中
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      上传图片
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Field */}
      <Card>
        <CardHeader>
          <CardTitle>昵称</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入你的昵称"
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            这将是你显示在应用中的名称
          </p>
        </CardContent>
      </Card>

      {/* Avatar URL Field */}
      <Card>
        <CardHeader>
          <CardTitle>头像链接（可选）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            或者输入图片 URL 作为你的头像
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=" + name)}
            >
              随机生成头像
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAvatar("")}
            >
              使用默认头像
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-900/20 border border-green-800 text-green-400"
              : "bg-red-900/20 border border-red-800 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="min-w-30">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中
            </>
          ) : (
            "保存更改"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
