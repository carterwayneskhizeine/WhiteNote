"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Link2, Loader2, ArrowLeft, Share2, MessageCircle, Bot } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { TipTapViewer } from "@/components/TipTapViewer"
import { MediaGrid } from "@/components/MediaGrid"
import { Separator } from "@/components/ui/separator"
import { cn, getHandle } from "@/lib/utils"
import { QuotedMessageCard } from "@/components/QuotedMessageCard"
import { ImageLightbox } from "@/components/ImageLightbox"
import { GoldieAvatar } from "@/components/GoldieAvatar"
import { Badge } from "@/components/ui/badge"

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string | null
  isAIBot: boolean
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>
  medias: Array<{ id: string; url: string; type: string; description: string | null }>
  author: {
    id: string
    name: string | null
    avatar: string | null
    email: string | null
  } | null
  quotedMessage: any
  message: {
    id: string
    content: string
  }
}

export default function CommentSharePage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const [comment, setComment] = useState<Comment | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [isExpanded, setIsExpanded] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchComment = async () => {
            try {
                // 使用公开 API 端点，不需要认证
                const response = await fetch(`/api/public/comments/${id}`)

                if (response.ok) {
                    const result = await response.json()
                    setComment(result.data)
                } else if (response.status === 404) {
                    setError("评论不存在")
                } else {
                    setError("加载失败")
                }
            } catch (err) {
                console.error("Failed to fetch comment:", err)
                setError("Failed to load comment")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) {
            fetchComment()
        }
    }, [id])

    // 检测内容是否需要"显示更多"按钮
    useEffect(() => {
        const checkOverflow = () => {
            if (contentRef.current) {
                const el = contentRef.current
                setHasMore(el.scrollHeight > el.clientHeight)
            }
        }

        const timer1 = setTimeout(checkOverflow, 100)
        const timer2 = setTimeout(checkOverflow, 300)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
        }
    }, [comment?.content])

    const handleCopyLink = async () => {
        try {
            const shareUrl = window.location.href
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error("Failed to copy link:", error)
        }
    }

    const handleImageClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setLightboxIndex(index)
        setLightboxOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !comment) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8 max-w-md">
                    <div className="text-6xl mb-4">💬</div>
                    <h1 className="text-2xl font-bold mb-2">评论不存在</h1>
                    <p className="text-muted-foreground mb-6">
                        {error || "该评论可能已被删除或链接不正确"}
                    </p>
                    <Button onClick={() => router.push('/')}>
                        返回首页
                    </Button>
                </div>
            </div>
        )
    }

    const formatTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
                locale: zhCN,
            })
        } catch {
            return ""
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-9 w-9"
                            onClick={() => router.push('/')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            <h1 className="text-lg font-bold">分享评论</h1>
                        </div>
                    </div>
                    <Button
                        variant={copied ? "default" : "outline"}
                        size="sm"
                        onClick={handleCopyLink}
                        className="gap-2"
                    >
                        <Link2 className="h-4 w-4" />
                        {copied ? "已复制" : "复制链接"}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto">
                {/* Comment Card */}
                <div className="p-6">
                    {/* Author Info */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className="shrink-0">
                            <GoldieAvatar
                                name={comment.author?.name || null}
                                avatar={comment.author?.avatar || null}
                                size="lg"
                                isAI={!comment.author}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-bold text-lg">
                                    {comment.author?.name || "GoldieRill"}
                                </span>
                                <span className="text-muted-foreground">
                                    @{getHandle(comment.author?.email || null, !!comment.author)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span>{formatTime(comment.createdAt)}</span>
                                {comment.updatedAt && new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() + 1000 && (
                                    <span>· 已编辑</span>
                                )}
                                {comment.isAIBot && <Bot className="h-3.5 w-3.5 text-primary" />}
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {comment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {comment.tags.map(({ tag }) => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-sm font-normal px-2.5 py-0.5"
                                >
                                    #{tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div
                        ref={contentRef}
                        className={cn(
                            "text-base leading-relaxed wrap-break-word text-foreground mb-4 overflow-hidden",
                            !isExpanded && "line-clamp-12"
                        )}
                        style={!isExpanded ? {
                            display: '-webkit-box',
                            WebkitLineClamp: 12,
                            WebkitBoxOrient: 'vertical',
                        } : {}}
                    >
                        <TipTapViewer content={comment.content} />
                    </div>
                    {hasMore && !isExpanded && (
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="text-primary text-sm font-medium mb-4 hover:underline flex items-center gap-1"
                        >
                            显示更多
                        </button>
                    )}

                    {/* Media */}
                    <MediaGrid
                        medias={comment.medias || []}
                        onImageClick={handleImageClick}
                        className="mb-4"
                    />

                    {/* Quoted Message */}
                    {comment.quotedMessage && (
                        <div className="mb-4">
                            <QuotedMessageCard message={comment.quotedMessage} />
                        </div>
                    )}

                    <Separator className="my-6" />

                    {/* Context Info */}
                    <div className="text-sm text-muted-foreground pb-6">
                        这是一条评论，回复了帖子{" "}
                        <span className="text-primary">
                            "{comment.message.content.slice(0, 50)}{comment.message.content.length > 50 ? '...' : ''}"
                        </span>
                    </div>
                </div>
            </div>

            {/* Image Lightbox */}
            <ImageLightbox
                media={comment?.medias || []}
                initialIndex={lightboxIndex}
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
            />
        </div>
    )
}
