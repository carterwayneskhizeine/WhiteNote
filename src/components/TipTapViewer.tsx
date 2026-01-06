"use client"

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { cn } from "@/lib/utils"

interface TipTapViewerProps {
  content: string
  className?: string
}

/**
 * Read-only TipTap viewer that supports Markdown content rendering.
 * Use this to display message content with proper Markdown formatting.
 */
export function TipTapViewer({ content, className }: TipTapViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false,
      }),
      Markdown.configure({
        markedOptions: {
          gfm: true, // GitHub Flavored Markdown
          breaks: true, // Convert \n to <br>
        },
      }),
    ],
    content,
    contentType: 'markdown', // Parse content as Markdown
    immediatelyRender: false,
    editable: false, // Make it read-only
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={cn("tipTap-viewer", className)}>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .tipTap-viewer .ProseMirror {
          outline: none;
          pointer-events: none; /* Ensure it's truly read-only */
        }

        /* Headings */
        .tipTap-viewer .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .tipTap-viewer .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }

        .tipTap-viewer .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .tipTap-viewer .ProseMirror h4,
        .tipTap-viewer .ProseMirror h5,
        .tipTap-viewer .ProseMirror h6 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        /* Paragraphs */
        .tipTap-viewer .ProseMirror p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        /* Code blocks */
        .tipTap-viewer .ProseMirror pre {
          background-color: var(--muted);
          border-radius: 0.375rem;
          padding: 0.75rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          overflow-x: auto;
        }

        .tipTap-viewer .ProseMirror code {
          background-color: var(--muted);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }

        .tipTap-viewer .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
        }

        /* Blockquotes */
        .tipTap-viewer .ProseMirror blockquote {
          border-left: 3px solid var(--primary);
          padding-left: 0.75rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: var(--muted-foreground);
          font-style: italic;
        }

        /* Lists */
        .tipTap-viewer .ProseMirror ul,
        .tipTap-viewer .ProseMirror ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
        }

        .tipTap-viewer .ProseMirror li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        /* Links */
        .tipTap-viewer .ProseMirror a {
          color: var(--primary);
          text-decoration: underline;
          text-decoration-color: var(--primary) / 30%;
        }

        .tipTap-viewer .ProseMirror a:hover {
          text-decoration-color: var(--primary);
        }

        /* Horizontal rules */
        .tipTap-viewer .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--border);
          margin-top: 1rem;
          margin-bottom: 1rem;
        }

        /* Strong and emphasis */
        .tipTap-viewer .ProseMirror strong {
          font-weight: 700;
        }

        .tipTap-viewer .ProseMirror em {
          font-style: italic;
        }

        /* Strikethrough */
        .tipTap-viewer .ProseMirror s {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  )
}
