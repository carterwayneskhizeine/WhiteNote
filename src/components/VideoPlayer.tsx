"use client"

import { useRef, useState, useEffect } from "react"

interface VideoPlayerProps {
  src: string
  className?: string
}

export function VideoPlayer({ src, className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVertical, setIsVertical] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      const aspectRatio = width / height

      // 判断是否为竖屏视频（宽高比小于 1，即 9:16 等）
      setIsVertical(aspectRatio < 1)
      setVideoLoaded(true)
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    // 如果视频已经加载了元数据
    if (video.readyState >= 1) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [src])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 竖屏视频在非全屏时使用 1:1 容器，横屏视频正常显示
  const shouldUseLetterbox = isVertical && !isFullscreen

  // 竖屏视频始终使用 contain 以保持完整内容，横屏视频使用 cover
  const objectFit = isVertical ? "contain" : "cover"

  return (
    <div
      ref={containerRef}
      className={className}
      style={shouldUseLetterbox ? {
        aspectRatio: "1/1",
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        maxHeight: "400px",
        maxWidth: "400px"
      } : {}}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        className={shouldUseLetterbox ? "max-h-full max-w-full" : "w-full h-full"}
        style={{
          objectFit
        }}
      />
    </div>
  )
}
