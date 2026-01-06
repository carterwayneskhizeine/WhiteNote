# Markdown Types API

## [](#types)Types

### [](#markdownextensionoptions)`MarkdownExtensionOptions`

Options for configuring the Markdown extension.

```
type MarkdownExtensionOptions = {
  indentation?: {
    style?: 'space' | 'tab'
    size?: number
  }
  marked?: typeof marked
  markedOptions?: MarkedOptions
}
```

* * *

### [](#markdownextensionspec)`MarkdownExtensionSpec`

Configuration for Markdown support in extensions.

```
type MarkdownExtensionSpec = {
  parseName?: string
  renderName?: string
  markdownName?: string // Legacy
  parseMarkdown?: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult
  renderMarkdown?: (node: JSONContent, helpers: MarkdownRendererHelpers, context: RenderContext) => string
  isIndenting?: boolean
  tokenizer?: MarkdownTokenizer
}
```

* * *

### [](#markdowntoken)`MarkdownToken`

Token structure from MarkedJS.

```
type MarkdownToken = {
  type: string
  raw?: string
  text?: string
  tokens?: MarkdownToken[]
  [key: string]: any
}
```

* * *

### [](#markdownparsehelpers)`MarkdownParseHelpers`

Helpers passed to parse handlers.

```
type MarkdownParseHelpers = {
  parseInline: (tokens: MarkdownToken[]) => JSONContent[]
  parseChildren: (tokens: MarkdownToken[]) => JSONContent[]
  createTextNode: (text: string, marks?: Array<{ type: string; attrs?: any }>) => JSONContent
  createNode: (type: string, attrs?: any, content?: JSONContent[]) => JSONContent
  applyMark: (markType: string, content: JSONContent[], attrs?: any) => MarkdownParseResult
}
```

* * *

### [](#markdownrendererhelpers)`MarkdownRendererHelpers`

Helpers passed to render handlers.

```
type MarkdownRendererHelpers = {
  renderChildren: (nodes: JSONContent | JSONContent[], separator?: string) => string
  wrapInBlock: (prefix: string, content: string) => string
  indent: (content: string) => string
}
```

* * *

### [](#rendercontext)`RenderContext`

Context information passed to render handlers.

```
type RenderContext = {
  index: number // Node index in parent
  level: number // Nesting level
  parentType?: string // Parent node type
  meta: Record<string, any> // Custom metadata
}
```

* * *

### [](#markdowntokenizer)`MarkdownTokenizer`

Custom tokenizer for MarkedJS.

```
type MarkdownTokenizer = {
  name: string
  level?: 'block' | 'inline'
  start?: (src: string) => number | undefined
  tokenize: (src: string, tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) => MarkdownToken | undefined
}
```

* * *

### [](#markdownlexerconfiguration)`MarkdownLexerConfiguration`

Lexer helpers for custom tokenizers.

```
type MarkdownLexerConfiguration = {
  inlineTokens: (src: string) => MarkdownToken[]
  blockTokens: (src: string) => MarkdownToken[]
}
```

* * *

### [](#markdownparseresult)`MarkdownParseResult`

Result type for parse handlers.

```
type MarkdownParseResult = JSONContent | JSONContent[] | { mark: string; content: JSONContent[]; attrs?: any } | null
```

* * *

### [](#extendablemarkdownspec)`ExtendableMarkdownSpec`

Markdown configuration in extensions.

```
type ExtendableMarkdownSpec = {
  name?: string
  parseName?: string
  renderName?: string
  parse?: (token: MarkdownToken, helpers: MarkdownParseHelpers) => MarkdownParseResult
  render?: (node: JSONContent, helpers: MarkdownRendererHelpers, context: RenderContext) => string
  isIndenting?: boolean
  tokenizer?: MarkdownTokenizer
}
```
