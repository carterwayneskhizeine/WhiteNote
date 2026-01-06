# Custom Markdown Tokenizers

Custom tokenizers extend the Markdown parser to support non-standard or custom syntax. This guide explains how tokenizers work and how to create your own.

> **Tip**: For standard patterns like Pandoc blocks or shortcodes, check the [Utility Functions](../api/utilities) first—they provide ready-made tokenizers.

## [](#what-are-tokenizers)What are Tokenizers?

Tokenizers are functions that identify and parse custom Markdown syntax into tokens. They're registered with MarkedJS and run during the lexing phase, before Tiptap's parse handlers process the tokens.

> **Note**: Want to learn more about Tokenizers? Check out the [Glossary](../glossary).

### [](#the-tokenization-flow)The Tokenization Flow

```
Markdown String
      ↓
Custom Tokenizers (identify custom syntax)
      ↓
Standard MarkedJS Lexer
      ↓
Markdown Tokens
      ↓
Extension Parse Handlers
      ↓
Tiptap JSON
```

## [](#when-to-use-custom-tokenizers)When to Use Custom Tokenizers

Use custom tokenizers when you want to support:

-   Custom inline syntax (e.g., `++inserted text++`, `==highlighted==`)
-   Custom block syntax (e.g., `:::note`, `!!!warning`)
-   Shortcodes (e.g., `[[embed:video-id]]`)
-   Custom Markdown extensions
-   Domain-specific notation

## [](#tokenizer-structure)Tokenizer Structure

A tokenizer is an object with these properties:

```
type MarkdownTokenizer = {
  name: string // Token name (must be unique)
  level?: 'block' | 'inline' // Level: block or inline
  start?: (src: string) => number // Where the token starts
  tokenize: (src, tokens, lexer) => MarkdownToken | undefined
}
```

### [](#properties-explained)Properties Explained

#### [](#name-required)`name` (required)

A unique identifier for your token type:

```
{
  name: 'highlight',
  // ...
}
```

This name will be used when registering parse handlers.

#### [](#level-optional)`level` (optional)

Whether this tokenizer operates at block or inline level:

```
{
  level: 'inline', // 'block' or 'inline'
  // ...
}
```

-   **`inline`**: For inline elements like bold, italic, custom marks (default)
-   **`block`**: For block elements like custom containers, admonitions

#### [](#start-optional)`start` (optional)

A function that returns the index where your token might start in the source string. This is an optimization to avoid unnecessary parsing attempts:

```
{
  start: (src) => {
    // Find where '==' appears in the source
    return src.indexOf('==')
  },
  // ...
}
```

This optimization helps MarkedJS skip irrelevant parts of the text. If omitted, MarkedJS will try your tokenizer at every position.

#### [](#tokenize-required)`tokenize` (required)

The main parsing function that identifies and tokenizes your syntax:

```
{
  tokenize: (src, tokens, lexer) => {
    // Try to match your syntax at the start of src
    const match = /^==(.+?)==/.exec(src)

    if (match) {
      return {
        type: 'highlight',
        raw: match[0],        // Full matched string
        text: match[1],       // Captured content
        tokens: lexer.inlineTokens(match[1]), // Parsed content
      }
    }

    // Return undefined if no match
    return undefined
  },
}
```

The function receives:

-   `src`: Remaining source text to parse
-   `tokens`: Previously parsed tokens (usually not needed)
-   `lexer`: Helper functions for tokenizing child content

So as described above the flow of your Markdown content will be:

```
Markdown => Tokenizer => Lexer => Token => markdown.parse() => Tiptap JSON
```

And from Tiptap JSON back to Markdown:

```
Tiptap JSON => markdown.render() => Markdown
```

## [](#creating-a-simple-inline-tokenizer)Creating a Simple Inline Tokenizer

Let's create a tokenizer for highlight syntax (`==text==`).

```
import { Node } from '@tiptap/core'

const Highlight = Node.create({
  name: 'highlight',

  // ... other config (parseHTML, renderHTML, etc.)

  // Define the custom tokenizer
  // note - this is turning Markdown strings to **tokens**
  markdownTokenizer: {
    name: 'highlight', // the token name you want to give to the token - must be unique and will be picked up by the parse function
    level: 'inline', // the tokenizer level - inline or block

    // This function should return the index of your syntax in the src string
    // or -1 if not found. This is an optimization to avoid running the tokenizer unnecessarily
    start: src => {
      return src.indexOf('==')
    },

    // The tokenize function extracts information from the src string and returns a token object
    // or undefined if the syntax is not matched
    tokenize: (src, tokens, lexer) => {
      // Match ==text== at the start of src
      const match = /^==([^=]+)==/.exec(src)

      if (!match) {
        return undefined
      }

      return {
        type: 'highlight',
        raw: match[0], // '==text=='
        text: match[1], // 'text'
        tokens: lexer.inlineTokens(match[1]), // Parse inline content
      }
    },
  },

  // Parse the token to Tiptap JSON
  // note - this is consuming **Tokens** and transforms them into Tiptap JSON
  parseMarkdown: (token, helpers) => {
    return helpers.applyMark('highlight', helpers.parseInline(token.tokens || []))
  },

  // Render back to Markdown
  renderMarkdown: (node, helpers) => {
    const content = helpers.renderChildren(node)
    return `==${content}==`
  },
})
```

### [](#using-the-extension)Using the Extension

```
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Highlight from './Highlight'

const editor = new Editor({
  extensions: [StarterKit, Markdown, Highlight],
})

// Parse Markdown with custom syntax
editor.commands.setContent('This is ==highlighted text==!', { contentType: 'markdown' })

// Get Markdown back
console.log(editor.getMarkdown())
// This is ==highlighted text==!
```

## [](#creating-a-block-level-tokenizer)Creating a Block-Level Tokenizer

Let's create a tokenizer for admonition blocks:

```
:::note
This is a note
:::
```

```
import { Node } from '@tiptap/core'

const Admonition = Node.create({
  name: 'admonition',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'note',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-admonition]',
        getAttrs: node => ({
          type: node.getAttribute('data-type'),
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      { 'data-admonition': '', 'data-type': node.attrs.type },
      0, // Content
    ]
  },

  markdownTokenizer: {
    name: 'admonition',
    level: 'block',

    start: src => {
      return src.indexOf(':::')
    },

    tokenize: (src, tokens, lexer) => {
      // Match :::type\ncontent\n:::
      const match = /^:::(\w+)\n([\s\S]*?)\n:::/.exec(src)

      if (!match) {
        return undefined
      }

      return {
        type: 'admonition',
        raw: match[0],
        admonitionType: match[1], // 'note', 'warning', etc.
        text: match[2], // Content
        tokens: lexer.blockTokens(match[2]), // Parse block content
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    return {
      type: 'admonition',
      attrs: {
        type: token.admonitionType || 'note',
      },
      content: helpers.parseChildren(token.tokens || []),
    }
  },

  renderMarkdown: (node, helpers) => {
    const type = node.attrs?.type || 'note'
    const content = helpers.renderChildren(node.content || [])

    return `:::${type}\n${content}\n:::\n\n`
  },
})
```

### [](#using-block-level-tokenizers)Using Block-Level Tokenizers

```
const markdown = `
# Document

:::note
This is a note with **bold** text.
:::

:::warning
This is a warning!
:::
`

editor.commands.setContent(markdown, { contentType: 'markdown' })
```

## [](#tokenizer-with-nested-content)Tokenizer with Nested Content

Let's create a tokenizer that supports nested inline parsing:

```
const Emoji = Node.create({
  name: 'emoji',
  group: 'inline',
  inline: true,

  addAttributes() {
    return {
      name: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'emoji',
        getAttrs: node => ({ name: node.getAttribute('data-name') }),
      },
    ]
  },

  renderHTML({ node }) {
    return ['emoji', { 'data-name': node.attrs.name }]
  },

  markdownTokenizer: {
    name: 'emoji',
    level: 'inline',

    start: src => {
      return src.indexOf(':')
    },

    tokenize: (src, tokens, lexer) => {
      // Match :emoji_name:
      const match = /^:([a-z0-9_+]+):/.exec(src)

      if (!match) {
        return undefined
      }

      return {
        type: 'emoji',
        raw: match[0],
        emojiName: match[1],
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    return {
      type: 'emoji',
      attrs: {
        name: token.emojiName,
      },
    }
  },

  renderMarkdown: (node, helpers) => {
    return `:${node.attrs?.name || 'unknown'}:`
  },
})
```

## [](#using-the-lexer-helpers)Using the Lexer Helpers

The `lexer` parameter provides helper functions to parse nested content:

### [](#lexerinlinetokenssrc)`lexer.inlineTokens(src)`

Parse inline content (for inline-level tokenizers):

```
tokenize: (src, tokens, lexer) => {
  const match = /^\[\[([^\]]+)\]\]/.exec(src)

  if (match) {
    return {
      type: 'custom',
      raw: match[0],
      tokens: lexer.inlineTokens(match[1]), // Parse inline content
    }
  }
}
```

### [](#lexerblocktokenssrc)`lexer.blockTokens(src)`

Parse block-level content (for block-level tokenizers):

```
tokenize: (src, tokens, lexer) => {
  const match = /^:::\w+\n([\s\S]*?)\n:::/.exec(src)

  if (match) {
    return {
      type: 'container',
      raw: match[0],
      tokens: lexer.blockTokens(match[1]), // Parse block content
    }
  }
}
```

## [](#regular-expression-best-practices)Regular Expression Best Practices

### [](#use-to-match-from-start)Use `^` to Match from Start

Always anchor your regex to the start of the string:

```
// ✅ Good - matches from start
/^==(.+?)==/

// ❌ Bad - can match anywhere
/==(.+?)==/
```

### [](#use-non-greedy-matching)Use Non-Greedy Matching

Use `+?` or `*?` instead of `+` or `*` for better control:

```
// ✅ Good - stops at first closing
/^==(.+?)==/

// ❌ Bad - matches too much
/^==(.+)==/
```

### [](#test-edge-cases)Test Edge Cases

Test your regex with:

-   Empty content: `====`
-   Nested syntax: `==text **bold** text==`
-   Multiple occurrences: `==one== ==two==`
-   Unclosed syntax: `==text`

```
// Handle unclosed syntax
const match = /^==([^=]+)==/.exec(src)
if (!match) {
  return undefined // Not matched, let standard parser handle it
}
```

## [](#debugging-tokenizers)Debugging Tokenizers

### [](#log-the-token-output)Log the Token Output

```
tokenize: (src, tokens, lexer) => {
  const match = /^==(.+?)==/.exec(src)

  if (match) {
    const token = {
      type: 'highlight',
      raw: match[0],
      tokens: lexer.inlineTokens(match[1]),
    }

    console.log('Tokenized:', token)
    return token
  }

  console.log('No match for:', src.substring(0, 20))
  return undefined
}
```

### [](#test-in-isolation)Test in Isolation

Test your tokenizer independently:

```
const src = '==highlighted text== and more'
const match = /^==(.+?)==/.exec(src)

console.log('Match:', match)
// ['==highlighted text==', 'highlighted text==']

// Adjust regex
const betterMatch = /^==([^=]+)==/.exec(src)
console.log('Better match:', betterMatch)
// ['==highlighted text==', 'highlighted text']
```

### [](#check-token-registry)Check Token Registry

Verify your tokenizer is registered:

```
console.log(editor.markdown.instance)
// Check the MarkedJS instance configuration
```

## [](#common-pitfalls)Common Pitfalls

### [](#1-forgetting-to-return-undefined)1\. Forgetting to Return `undefined`

Always return `undefined` when your syntax doesn't match:

```
// ✅ Good
tokenize: (src, tokens, lexer) => {
  const match = /^==(.+?)==/.exec(src)
  if (!match) {
    return undefined // Important!
  }
  return {
    /* token */
  }
}

// ❌ Bad - returns falsy value
tokenize: (src, tokens, lexer) => {
  const match = /^==(.+?)==/.exec(src)
  return match
    ? {
        /* token */
      }
    : null // Should be undefined
}
```

### [](#2-not-including-raw)2\. Not Including `raw`

Always include the full matched string in `raw`:

```
return {
  type: 'highlight',
  raw: match[0], // Full match including delimiters
  text: match[1], // Content only
}
```

### [](#3-wrong-level)3\. Wrong Level

Make sure `level` matches your tokenizer's purpose:

```
// Inline element (within text)
{
  level: 'inline'
}

// Block element (standalone)
{
  level: 'block'
}
```

### [](#4-consuming-too-much)4\. Consuming Too Much

Be careful not to consume content beyond your syntax:

```
// ✅ Good - stops at closing delimiter
/^==([^=]+)==/

// ❌ Bad - might consume multiple blocks
/^==([\s\S]+)==/
```

## [](#advanced-stateful-tokenizers)Advanced: Stateful Tokenizers

For complex syntax, maintain state across tokenization:

```
let nestedLevel = 0

const tokenizer = {
  name: 'nested',
  level: 'block',

  tokenize: (src, tokens, lexer) => {
    if (src.startsWith('{{')) {
      nestedLevel++
      // Handle opening
    }

    if (src.startsWith('}}')) {
      nestedLevel--
      // Handle closing
    }

    // Process based on state
  },
}
```

## [](#see-also)See also

-   Try [Utility Functions](../api/utilities) for standard patterns before creating custom tokenizers