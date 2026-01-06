# Basic Usage

This guide covers the core operations for working with Markdown: parsing Markdown into your editor and serializing editor content back to Markdown.

## [](#getting-markdown-from-the-editor)Getting Markdown from the Editor

Use `getMarkdown()` to serialize your editor content to Markdown:

```
const markdown = editor.getMarkdown()
console.log(markdown)
// # Hello
//
// This is a **test**.
```

## [](#setting-content-from-markdown)Setting Content from Markdown

All content commands support the `contentType` option:

```
// 1. Initial content
const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: '# Hello World\n\nThis is **markdown**!',
  contentType: 'markdown',
})

// 2. Replace all content
editor.commands.setContent('# New Content', { contentType: 'markdown' })

// 3. Insert at cursor
editor.commands.insertContent('**Bold** text', { contentType: 'markdown' })

// 4. Insert at specific position
editor.commands.insertContentAt(10, '## Heading', { contentType: 'markdown' })

// 5. Replace a range
editor.commands.insertContentAt({ from: 10, to: 20 }, '**Replace**', { contentType: 'markdown' })
```

## [](#using-the-markdownmanager-directly)Using the MarkdownManager Directly

For more control, access the `MarkdownManager` via `editor.markdown`:

```
// Parse Markdown to JSON
const json = editor.markdown.parse('# Hello World')
console.log(json)
// { type: 'doc', content: [...] }

// Serialize JSON to Markdown
const markdown = editor.markdown.serialize(json)
console.log(markdown)
// # Hello World
```

This is useful when working with JSON content outside the editor context.

## [](#github-flavored-markdown-gfm)GitHub Flavored Markdown (GFM)

Enable GFM for features like tables and task lists:

```
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

const editor = new Editor({
  extensions: [
    StarterKit,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem,
    Markdown.configure({
      markedOptions: { gfm: true },
    }),
  ],
})
```

## [](#inline-formatting)Inline Formatting

Standard Markdown formatting works automatically:

```
const markdown = `
**bold text** or __bold text__
*italic text* or _italic text_
***bold and italic***
[Link Text](https://example.com)
\`inline code\`
`

editor.commands.setContent(markdown, { contentType: 'markdown' })
const result = editor.getMarkdown() // Formatting preserved
```

## [](#working-with-block-elements)Working with Block Elements

Block elements like headings, lists, and code blocks work as expected:

### [](#headings)Headings

```
const markdown = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
`
```

### [](#lists)Lists

```
// Unordered lists
const markdown = `
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3
`

// Ordered lists
const markdown = `
1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item
`
```

### [](#code-blocks)Code Blocks

```
const markdown = `
\`\`\`javascript
function hello() {
  console.log('Hello World')
}
\`\`\`
`
```

### [](#blockquotes)Blockquotes

```
const markdown = `
> This is a blockquote.
> It can span multiple lines.
>
> > And can be nested.
`
```

## [](#handling-html-in-markdown)Handling HTML in Markdown

The Markdown extension can parse HTML embedded in Markdown using Tiptap's existing `parseHTML` methods:

```
const markdown = `
# Heading

<div class="custom">
  <p>This HTML will be parsed</p>
</div>

Regular **Markdown** continues here.
`

editor.commands.setContent(markdown, { contentType: 'markdown' })
```

The HTML is parsed according to your extensions' `parseHTML` rules, allowing you to support custom HTML nodes.

## [](#best-practices)Best Practices

**Always use `contentType`** and set it to `markdown` when setting Markdown content (otherwise it's treated as HTML):

```
editor.commands.setContent(markdown, { contentType: 'markdown' })
```

**Include all needed extensions** or content may be lost:

```
const editor = new Editor({
  extensions: [StarterKit, Markdown], // StarterKit covers most common nodes
})
```

**Test round-trip conversion** to ensure your custom Markdown content survives parse → serialize:

```
editor.commands.setContent('# Hello **World**', { contentType: 'markdown' })
const result = editor.getMarkdown() // Should match original
```

## [](#key-components)Key Components

### [](#markdownmanager)`MarkdownManager`

The `MarkdownManager` class is the core engine that handles parsing and serialization. It:

-   Wraps and configures the MarkedJS instance
-   Maintains a registry of extension handlers
-   Creates the [Lexer](../glossary/#lexer) instance and registers all [Tokenizers](../glossary/#tokenizer).
-   Coordinates between Markdown tokens and Tiptap JSON nodes

### [](#markdown-extension)`Markdown` extension

The `Markdown` extension is the main extension that you add to your editor. It provides:

-   Overrides for all **content-related** commands on the editor to support Markdown input/output
-   The `getMarkdown()` method to serialize content as Markdown
-   The `setContent()` command with `contentType: 'markdown'` option to parse Markdown input
-   Access to the [`MarkdownManager`](#markdownmanager) instance via `editor.markdown`

### [](#extension-handlers)Extension Handlers

Each Tiptap extension can provide Markdown support by configuring the extension:

```
const MyExtension = Node.create({
  // ...

  renderMarkdown: (token, helpers) => { /* ... */ },
  parseMarkdown: (node, helpers) => { /* ... */ },
  markdownTokenizer: { /* ... */ },
})
```

The handlers translate between Markdown tokens and Tiptap nodes in both directions and are automatically registered by the [`MarkdownManager`](../glossary/#markdownmanager), creating [Tokenizers](../glossary/#tokenizer) out of them and registering those to the [Lexer](../glossary/#lexer).

Learn more about:

-   [`renderMarkdown`](../advanced-usage/custom-serializing)
-   [`parseMarkdown`](../advanced-usage/custom-parsing)
-   [`markdownTokenizer`](../advanced-usage/custom-tokenizer)