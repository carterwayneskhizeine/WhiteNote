"use client"

import { useState } from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Image as ImageIcon, Smile, Paperclip, Loader2 } from "lucide-react"
import { messagesApi } from "@/lib/api/messages"
import { useSession } from "next-auth/react"

interface InputMachineProps {
  onSuccess?: () => void
}

export function InputMachine({ onSuccess }: InputMachineProps) {
  const { data: session } = useSession()
  const [isPosting, setIsPosting] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "What's on your mind? Type '/' for commands...",
      }),
    ],
    immediatelyRender: false,
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none min-h-[100px] w-full bg-transparent',
      },
    },
    onUpdate: ({ editor }) => {
      // Check if editor has content
      const text = editor.getText()
      const html = editor.getHTML()
      const isEmpty = text.trim().length === 0 && html === '<p></p>'
      setHasContent(!isEmpty)
    },
  })

  const handlePost = async () => {
    if (!editor || isPosting || !hasContent) return

    const content = editor.getHTML()

    setIsPosting(true)
    try {
      await messagesApi.createMessage({
        content,
        tags: [], // TODO: Add tag support
      })

      // Clear editor
      editor.commands.clearContent()
      setHasContent(false)

      // Call success callback
      onSuccess?.()
    } catch (error) {
      console.error("Failed to create message:", error)
      // TODO: Show error toast
    } finally {
      setIsPosting(false)
    }
  }

  // Get user initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="border-b px-4 py-4">
      <div className="flex gap-3">
        {/* User avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={session?.user?.image || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {getInitials(session?.user?.name)}
          </AvatarFallback>
        </Avatar>

        {/* Input area */}
        <div className="flex-1 flex flex-col gap-4">
          <EditorContent editor={editor} className="w-full" />

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex gap-1 text-primary">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-full">
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>
            <Button
              className="rounded-full px-5 font-bold bg-primary hover:bg-primary/90 text-white shadow-sm"
              disabled={!hasContent || isPosting}
              onClick={handlePost}
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
