"use client"

import { useState, KeyboardEvent } from "react"
import { X } from "lucide-react"

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  className?: string
}

export function TagInput({ tags, onChange, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 按回车或逗号添加标签
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
    // 按退格删除最后一个标签
    if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const addTag = () => {
    const trimmed = inputValue.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue("")
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center text-sm text-primary font-normal group"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-0.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        className="flex-1 min-w-[60px] bg-transparent border-0 outline-none text-sm h-6 p-0"
      />
    </div>
  )
}
