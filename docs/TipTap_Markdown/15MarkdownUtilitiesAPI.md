# Markdown Utilities

## [](#block-utilities)Block Utilities

### [](#createblockmarkdownspec)`createBlockMarkdownSpec`

Creates a complete Markdown specification for block-level nodes using Pandoc-style syntax (`:::blockName`).

This utility can be be imported from `@tiptap/core`.

#### [](#syntax)Syntax

```
:::blockName {attributes}

Content goes here
Can be **multiple** paragraphs

:::
```

#### [](#usage)Usage

```
import { Node } from '@tiptap/core'
import { createBlockMarkdownSpec } from '@tiptap/core'

const Callout = Node.create({
  name: 'callout',

  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: { default: 'info' },
      title: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ node }) {
    return ['div', { 'data-callout': node.attrs.type }, 0]
  },

  // Use the utility to generate Markdown support
  ...createBlockMarkdownSpec({
    nodeName: 'callout',
    defaultAttributes: { type: 'info' },
    allowedAttributes: ['type', 'title'],
    content: 'block', // Allow nested block content
  }),
})
```

#### [](#options)Options

Option

Type

Default

Description

`nodeName`

`string`

_required_

Tiptap node name

`name`

`string`

`nodeName`

Markdown syntax name

`content`

`'block' | 'inline'`

`'block'`

Content type

`defaultAttributes`

`Object`

`{}`

Default attrs when parsing

`allowedAttributes`

`string[]`

all

Whitelist for rendering

`getContent`

`(token) => string`

auto

Custom content extraction

`parseAttributes`

`(str) => Object`

auto

Custom attribute parser

`serializeAttributes`

`(attrs) => string`

auto

Custom serializer

#### [](#example-markdown)Example Markdown

```
:::callout {type="warning" title="Important"}

This is a warning callout with a title.

It can contain multiple paragraphs and **formatting**.

:::

:::note

Simple note without attributes.

:::
```

* * *

### [](#createatomblockmarkdownspec)`createAtomBlockMarkdownSpec`

Creates a Markdown specification for atomic (self-closing) block nodes using Pandoc syntax.

This utility can be be imported from `@tiptap/core`.

#### [](#syntax)Syntax

```
:::nodeName {attributes} :::
```

No closing tag, no content. Perfect for embeds, images, horizontal rules, etc.

#### [](#usage)Usage

```
import { Node } from '@tiptap/core'
import { createAtomBlockMarkdownSpec } from '@tiptap/core'

const Youtube = Node.create({
  name: 'youtube',

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      start: { default: 0 },
      width: { default: 640 },
      height: { default: 480 },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="youtube.com"]',
        getAttrs: dom => ({
          src: dom.getAttribute('src'),
        }),
      },
    ]
  },

  renderHTML({ node }) {
    return ['iframe', { src: node.attrs.src }, 0]
  },

  // Use the utility for atomic block Markdown
  ...createAtomBlockMarkdownSpec({
    nodeName: 'youtube',
    requiredAttributes: ['src'], // Must have src attribute
    defaultAttributes: { start: 0 },
    allowedAttributes: ['src', 'start', 'width', 'height'],
  }),
})
```

#### [](#options)Options

Option

Type

Default

Description

`nodeName`

`string`

_required_

Tiptap node name

`name`

`string`

`nodeName`

Markdown syntax name

`requiredAttributes`

`string[]`

`[]`

Required attrs for valid parse

`defaultAttributes`

`Object`

`{}`

Default attrs when parsing

`allowedAttributes`

`string[]`

all

Whitelist for rendering

`parseAttributes`

`(str) => Object`

auto

Custom attribute parser

`serializeAttributes`

`(attrs) => string`

auto

Custom serializer

#### [](#example-markdown)Example Markdown

```
:::youtube {src="https://youtube.com/watch?v=dQw4w9WgXcQ" start="30"}

:::image {src="photo.jpg" alt="A beautiful photo" width="800"}

:::hr
```

* * *

## [](#inline-utilities)Inline Utilities

### [](#createinlinemarkdownspec)`createInlineMarkdownSpec`

Creates a Markdown specification for inline nodes using shortcode syntax (`[nodeName]`).

This utility can be be imported from `@tiptap/core`.

#### [](#syntax)Syntax

```
<!-- Self-closing -->

[nodeName attribute="value" other="data"]

<!-- With content -->

[nodeName attribute="value"]content[/nodeName]
```

#### [](#usage-self-closing)Usage - Self-Closing

```
import { Node } from '@tiptap/core'
import { createInlineMarkdownSpec } from '@tiptap/core'

const Mention = Node.create({
  name: 'mention',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }]
  },

  renderHTML({ node }) {
    return ['span', { 'data-mention': node.attrs.id }, `@${node.attrs.label}`]
  },

  // Use the utility for self-closing inline Markdown
 ...createInlineMarkdownSpec({
    nodeName: 'mention',
    selfClosing: true,
    allowedAttributes: ['id', 'label'],
  }),
})
```

#### [](#usage-with-content)Usage - With Content

```
const Highlight = Node.create({
  name: 'highlight',

  group: 'inline',
  content: 'inline*',

  addAttributes() {
    return {
      color: { default: 'yellow' },
    }
  },

  parseHTML() {
    return [{ tag: 'mark' }]
  },

  renderHTML({ node }) {
    return ['mark', { 'data-color': node.attrs.color }, 0]
  },

  // Use the utility for inline Markdown with content
  ...createInlineMarkdownSpec({
    nodeName: 'highlight',
    selfClosing: false, // Has content
    allowedAttributes: ['color'],
  }),
})
```

#### [](#options)Options

Option

Type

Default

Description

`nodeName`

`string`

_required_

Tiptap node name

`name`

`string`

`nodeName`

Shortcode name

`selfClosing`

`boolean`

`false`

Has no content

`defaultAttributes`

`Object`

`{}`

Default attrs when parsing

`allowedAttributes`

`string[]`

all

Whitelist for rendering

`getContent`

`(node) => string`

auto

Custom content extraction

`parseAttributes`

`(str) => Object`

auto

Custom attribute parser

`serializeAttributes`

`(attrs) => string`

auto

Custom serializer

#### [](#example-markdown)Example Markdown

```
<!-- Mentions -->

Hey [mention id="user123" label="John"]!

<!-- Emoji -->

Party time [emoji name="party_popper"]!

<!-- Highlight with content -->

This is [highlight color="yellow"]important text[/highlight] to read.
```

* * *

## [](#parse-helpers)Parse Helpers

Helpers provided to extension parse handlers.

### [](#parseinlinetokens)`parseInline(tokens)`

Parse inline tokens (bold, italic, links, etc.).

```
helpers.parseInline(tokens: MarkdownToken[]): JSONContent[]
```

**Parameters:**

-   `tokens`: Array of inline Markdown tokens

**Returns:**

-   `JSONContent[]` - Array of Tiptap JSON nodes

**Example:**

```
parse: (token, helpers) => {
  return {
    type: 'paragraph',
    content: helpers.parseInline(token.tokens || []),
  }
}
```

* * *

### [](#parsechildrentokens)`parseChildren(tokens)`

Parse block-level child tokens.

```
helpers.parseChildren(tokens: MarkdownToken[]): JSONContent[]
```

**Parameters:**

-   `tokens`: Array of block-level Markdown tokens

**Returns:**

-   `JSONContent[]` - Array of Tiptap JSON nodes

**Example:**

```
parse: (token, helpers) => {
  return {
    type: 'blockquote',
    content: helpers.parseChildren(token.tokens || []),
  }
}
```

* * *

### [](#createtextnodetext-marks)`createTextNode(text, marks)`

Create a text node with optional marks.

```
helpers.createTextNode(
  text: string,
  marks?: Array<{ type: string; attrs?: any }>
): JSONContent
```

**Parameters:**

-   `text`: The text content
-   `marks`: Optional array of marks to apply

**Returns:**

-   `JSONContent` - Text node

**Example:**

```
parse: (token, helpers) => {
  return helpers.createTextNode('Hello', [{ type: 'bold' }, { type: 'italic' }])
}
```

* * *

### [](#createnodetype-attrs-content)`createNode(type, attrs, content)`

Create a node with type, attributes, and content.

```
helpers.createNode(
  type: string,
  attrs?: Record<string, any>,
  content?: JSONContent[]
): JSONContent
```

**Parameters:**

-   `type`: Node type name
-   `attrs`: Optional node attributes
-   `content`: Optional node content

**Returns:**

-   `JSONContent` - The created node

**Example:**

```
parse: (token, helpers) => {
  return helpers.createNode('heading', { level: 2 }, [helpers.createTextNode('Title')])
}
```

* * *

### [](#applymarkmarktype-content-attrs)`applyMark(markType, content, attrs)`

Apply a mark to content (for inline formatting).

```
helpers.applyMark(
  markType: string,
  content: JSONContent[],
  attrs?: Record<string, any>
): MarkdownParseResult
```

**Parameters:**

-   `markType`: Mark type name
-   `content`: Content to apply mark to
-   `attrs`: Optional mark attributes

**Returns:**

-   `MarkdownParseResult` - Mark result object

**Example:**

```
parse: (token, helpers) => {
  const content = helpers.parseInline(token.tokens || [])
  return helpers.applyMark('bold', content)
}
```

* * *

## [](#render-helpers)Render Helpers

Helpers provided to extension render handlers.

### [](#renderchildrennodes-separator)`renderChildren(nodes, separator)`

Render child nodes to Markdown.

```
helpers.renderChildren(
  nodes: JSONContent | JSONContent[],
  separator?: string
): string
```

**Parameters:**

-   `nodes`: Node or array of nodes to render
-   `separator`: Optional separator between nodes (default: `''`)

**Returns:**

-   `string` - Rendered Markdown

**Example:**

```
render: (node, helpers) => {
  const content = helpers.renderChildren(node.content || [])
  return `> ${content}\n\n`
}
```

* * *

### [](#indentcontent)`indent(content)`

Add indentation to content.

```
helpers.indent(content: string): string
```

**Parameters:**

-   `content`: Content to indent

**Returns:**

-   `string` - Indented content

**Example:**

```
render: (node, helpers) => {
  const content = helpers.renderChildren(node.content || [])
  return helpers.indent(content)
}
```

* * *

### [](#wrapinblockprefix-content)`wrapInBlock(prefix, content)`

Wrap content with a prefix on each line.

```
helpers.wrapInBlock(
  prefix: string,
  content: string
): string
```

**Parameters:**

-   `prefix`: Prefix to add to each line
-   `content`: Content to wrap

**Returns:**

-   `string` - Wrapped content

**Example:**

```
render: (node, helpers) => {
  const content = helpers.renderChildren(node.content || [])
  return helpers.wrapInBlock('> ', content) + '\n\n'
}
```

* * *

## [](#miscellaneous-utilities)Miscellaneous Utilities

### [](#parseattributes)`parseAttributes`

The `parseAttributes` utility is mostly used internally for building attribute objects for Pandoc-style strings. You most likely won't use it except you want to build a custom syntax that requires similar syntax to the Pandoc attribute style.

This utility can be be imported from `@tiptap/core`.

#### [](#supported-formats)Supported Formats

```
import { parseAttributes } from '@tiptap/core'

// Classes (prefix with .)
parseAttributes('.btn .primary')
// → { class: 'btn primary' }

// IDs (prefix with #)
parseAttributes('#submit')
// → { id: 'submit' }

// Key-value pairs (quoted values)
parseAttributes('type="button" disabled')
// → { type: 'button', disabled: true }

// Combined
parseAttributes('.btn #submit type="button" disabled')
// → { class: 'btn', id: 'submit', type: 'button', disabled: true }

// Complex example
parseAttributes('.card .elevated #main-card title="My Card" data-id="123" visible')
// → {
//   class: 'card elevated',
//   id: 'main-card',
//   title: 'My Card',
//   'data-id': '123',
//   visible: true
// }
```

#### [](#usage)Usage

```
import { parseAttributes } from '@tiptap/core'

const attrString = '.highlight #section-1 color="yellow" bold'
const attrs = parseAttributes(attrString)

console.log(attrs)
// {
//   class: 'highlight',
//   id: 'section-1',
//   color: 'yellow',
//   bold: true
// }
```

* * *

### [](#serializeattributes)`serializeAttributes`

The `serializeAttributes` utility is mostly used internally for converting attribute objects back to Pandoc-style strings. You most likely won't use it except you want to build a custom syntax that requires similar syntax to the Pandoc attribute style.

This utility can be be imported from `@tiptap/core`.

#### [](#usage)Usage

```
import { serializeAttributes } from '@tiptap/core'

const attrs = {
  class: 'btn primary',
  id: 'submit',
  type: 'button',
  disabled: true,
  'data-value': '123',
}

const attrString = serializeAttributes(attrs)
console.log(attrString)
// .btn.primary #submit disabled type="button" data-value="123"
```

#### [](#rules)Rules

-   Classes are prefixed with `.` and space-separated
-   IDs are prefixed with `#`
-   Boolean `true` values become standalone attributes
-   String values are quoted with `"`
-   Null/undefined values are omitted

* * *

### [](#parseindentedblocks)`parseIndentedBlocks`

Advanced utility for parsing hierarchical indented blocks (lists, task lists, etc.).

This utility can be be imported from `@tiptap/core`.

#### [](#when-to-use)When to Use

Use this when you need to parse Markdown with:

-   Nested items based on indentation
-   Hierarchical structure (not flat)
-   Custom block patterns

#### [](#usage-example-task-list)Usage Example - Task List

```
import { parseIndentedBlocks } from '@tiptap/core'

const src = `
- [ ] Task 1
  - [x] Subtask 1.1
  - [ ] Subtask 1.2
- [x] Task 2
`

const result = parseIndentedBlocks(
  src,
  {
    // Pattern to match task items
    itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/,

    // Extract data from matched line
    extractItemData: match => ({
      indentLevel: match[1].length,
      mainContent: match[4],
      checked: match[3].toLowerCase() === 'x',
    }),

    // Create the final token
    createToken: (data, nestedTokens) => ({
      type: 'taskItem',
      checked: data.checked,
      text: data.mainContent,
      nestedTokens, // Nested items
    }),
  },
  lexer,
)

console.log(result)
// {
//   items: [
//     {
//       type: 'taskItem',
//       checked: false,
//       text: 'Task 1',
//       nestedTokens: [
//         { type: 'taskItem', checked: true, text: 'Subtask 1.1' },
//         { type: 'taskItem', checked: false, text: 'Subtask 1.2' }
//       ]
//     },
//     {
//       type: 'taskItem',
//       checked: true,
//       text: 'Task 2'
//     }
//   ]
// }
```

#### [](#options)Options

```
interface BlockParserConfig {
  itemPattern: RegExp // Pattern to match items
  extractItemData: (match) => {
    mainContent: string
    indentLevel: number
    [key: string]: any
  }
  createToken: (data, nestedTokens?) => ParsedBlock
  baseIndentSize?: number // Base indent (default: 2)
  customNestedParser?: (src) => any[] // Custom nested parser
}
```

* * *

### [](#rendernestedmarkdowncontent)`renderNestedMarkdownContent`

Utility for rendering nodes with nested content, properly indenting child elements.

This utility can be be imported from `@tiptap/core`.

#### [](#when-to-use)When to Use

Use this when rendering:

-   List items with nested content
-   Blockquotes with nested elements
-   Task items with subtasks
-   Any node with a prefix and nested children

#### [](#usage-example-list-item)Usage Example - List Item

```
import { renderNestedMarkdownContent } from '@tiptap/core'

const ListItem = Node.create({
  name: 'listItem',

  renderMarkdown: (node, h) => {
    // Static prefix
    return renderNestedMarkdownContent(node, h, '- ')
  },
})
```

#### [](#usage-example-task-item)Usage Example - Task Item

```
const TaskItem = Node.create({
  name: 'taskItem',

  renderMarkdown: (node, h) => {
    // Dynamic prefix based on checked state
    const prefix = `- [${node.attrs?.checked ? 'x' : ' '}] `
    return renderNestedMarkdownContent(node, h, prefix)
  },
})
```

#### [](#usage-example-context-based-prefix)Usage Example - Context-Based Prefix

```
const ListItem = Node.create({
  name: 'listItem',

  renderMarkdown: (node, h, ctx) => {
    // Prefix changes based on parent type
    return renderNestedMarkdownContent(
      node,
      h,
      ctx => {
        if (ctx.parentType === 'orderedList') {
          return `${ctx.index + 1}. `
        }
        return '- '
      },
      ctx,
    )
  },
})
```

#### [](#signature)Signature

```
function renderNestedMarkdownContent(
  node: JSONContent,
  helpers: {
    renderChildren: (nodes: JSONContent[]) => string
    indent: (text: string) => string
  },
  prefixOrGenerator: string | ((ctx: any) => string),
  ctx?: any,
): string
```

* * *

## [](#complete-examples)Complete Examples

### [](#example-1-callout-block)Example 1: Callout Block

```
import { Node } from '@tiptap/core'
import { createBlockMarkdownSpec } from '@tiptap/core'

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: { default: 'info' },
      title: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ node }) {
    return [
      'div',
      {
        'data-callout': '',
        'data-type': node.attrs.type,
        'data-title': node.attrs.title,
      },
      0,
    ]
  },

  ...createBlockMarkdownSpec({
    nodeName: 'callout',
    defaultAttributes: { type: 'info' },
    allowedAttributes: ['type', 'title'],
  }),
})
```

**Markdown:**

```
:::callout {type="warning" title="Watch out!"}
This is important information that needs attention.
:::
```

* * *

### [](#example-2-youtube-embed)Example 2: YouTube Embed

```
import { Node } from '@tiptap/core'
import { createAtomBlockMarkdownSpec } from '@tiptap/core'

export const Youtube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      start: { default: 0 },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src*="youtube.com"]' }]
  },

  renderHTML({ node }) {
    return ['iframe', { src: node.attrs.src }]
  },

  ...createAtomBlockMarkdownSpec({
    nodeName: 'youtube',
    requiredAttributes: ['src'],
    allowedAttributes: ['src', 'start'],
  }),
})
```

**Markdown:**

```
:::youtube {src="https://youtube.com/watch?v=dQw4w9WgXcQ" start="30"}
```

* * *

### [](#example-3-mention-inline)Example 3: Mention (Inline)

```
import { Node } from '@tiptap/core'
import { createInlineMarkdownSpec } from '@tiptap/core'

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }]
  },

  renderHTML({ node }) {
    return ['span', { 'data-mention': node.attrs.id }, `@${node.attrs.label}`]
  },

  ...createInlineMarkdownSpec({
    nodeName: 'mention',
    selfClosing: true,
    allowedAttributes: ['id', 'label'],
  }),
})
```

**Markdown:**

```
Hey [mention id="user123" label="John"], check this out!
```

## [](#when-to-use-what)When to Use What

### [](#use-utilities-when)Use Utilities When:

-   ✅ Following standard Markdown conventions (Pandoc, shortcodes)
-   ✅ Standard attribute parsing is sufficient
-   ✅ Block/inline distinction is clear
-   ✅ Quick implementation is desired
-   ✅ Maintaining consistency across extensions

### [](#use-custom-implementation-when)Use Custom Implementation When:

-   ✅ Non-standard Markdown syntax required
-   ✅ Complex parsing logic needed
-   ✅ Fine-grained control over tokens
-   ✅ Custom attribute formats

* * *

## [](#related-documentation)Related Documentation

-   [Custom Tokenizers](../advanced-usage/custom-tokenizer) - For custom syntax that doesn't follow conventions
-   [Extension Integration](../guides/integrate-markdown-in-your-extension) - General guide to adding Markdown to extensions
-   [Advanced Customization](../advanced-usage) - Custom parse and render handlers
-   [API Reference](../) - Complete API documentation

* * *

**Pro Tip**: Start with utilities for standard patterns, then move to custom implementations only when you need specific behavior that utilities don't provide.
