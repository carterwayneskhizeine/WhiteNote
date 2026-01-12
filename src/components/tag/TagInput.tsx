"use client"

import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState, KeyboardEvent, useRef, useEffect } from "react"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  maxTags?: number
}

export function TagInput({
  tags,
  onChange,
  placeholder = "添加标签...",
  disabled = false,
  maxTags = 10
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const handleAddTag = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Remove # prefix if user typed it
    const cleanTag = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed

    if (tags.length >= maxTags) {
      alert(`最多只能添加 ${maxTags} 个标签`)
      return
    }

    if (tags.includes(cleanTag)) {
      setInputValue("")
      return
    }

    onChange([...tags, cleanTag])
    setInputValue("")

    // Keep input open if we haven't reached max
    if (tags.length + 1 < maxTags) {
      inputRef.current?.focus()
    } else {
      setShowInput(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag when backspacing with empty input
      onChange(tags.slice(0, -1))
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="px-2 py-1 text-sm gap-1 bg-primary/10 text-primary hover:bg-primary/20"
        >
          <span>#{tag}</span>
          {!disabled && (
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 hover:bg-primary/30 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {!disabled && tags.length < maxTags && (
        <div className="flex items-center gap-1">
          {showInput ? (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => {
                if (inputValue.trim()) {
                  handleAddTag()
                } else {
                  setShowInput(false)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-6 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[100px]"
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowInput(true)}
              className="h-6 px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              添加标签
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
