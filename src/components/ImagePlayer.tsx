"use client"

import { useRef, useState, useEffect } from "react"

interface ImagePlayerProps {
  src: string
  alt?: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void
}

export function ImagePlayer({ src, alt, className = "", onClick }: ImagePlayerProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [isVertical, setIsVertical] = useState(false)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const handleLoad = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      const aspectRatio = width / height

      // 判断是否为竖图（宽高比小于 0.75，即 3:4 或更窄）
      setIsVertical(aspectRatio < 0.75)
    }

    img.addEventListener("load", handleLoad)

    // 如果图片已经加载
    if (img.complete) {
      handleLoad()
    }

    return () => {
      img.removeEventListener("load", handleLoad)
    }
  }, [src])

  // 竖图使用 3:4 容器，限制宽度为 400px，靠左显示
  const shouldConstrain = isVertical

  return (
    <div
      className={className}
      style={shouldConstrain ? {
        aspectRatio: "3/4",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        maxWidth: "400px"
      } : {}}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        onClick={onClick}
        className={shouldConstrain ? "max-h-full max-w-full object-contain cursor-pointer hover:opacity-90 transition-opacity" : "w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"}
      />
    </div>
  )
}
