# Editor

The Markdown package does not export a new Editor class but extends the existing Tiptap Editor class. This means you can use all the standard methods and options of Tiptap's Editor, along with the additional functionality provided by the Markdown package.

## [](#methods)Methods

### [](#editorgetmarkdown)`Editor.getMarkdown()`

Get the current content of the editor as Markdown.

-   **returns**: `string`

```
const markdown = editor.getMarkdown()
```

## [](#properties)Properties

### [](#editormarkdown)`Editor.markdown`

Access the MarkdownManager instance.

```
editor.markdown: MarkdownManager
```

#### [](#example)Example

```
// Parse Markdown to JSON
const json = editor.markdown.parse('# Hello')

// Serialize JSON to Markdown
const markdown = editor.markdown.serialize(json)

// Access marked instance
const marked = editor.markdown.instance
```

## [](#options)Options

### [](#editorcontent)`Editor.content`

Editor content supports **HTML**, **Markdown** or **Tiptap JSON** as a value.

> **Note**: For Markdown support `editor.contentAsMarkdown` must be set to `true`.

-   **type**: `string | object`
-   **default**: `''`
-   **required**: `false`

```
const editor = new Editor({
  content: '<h1>Hello world</h1>',
})
```

```
const editor = new Editor({
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Hello world' }] },
  ],
})
```

```
const editor = new Editor({
  content: '# Hello world',
  contentType: 'markdown',
})
```

### [](#editorcontenttype)`Editor.contentType`

Defines what type of content is passed to the editor. Defaults to `json`. When an invalid combination is set - for example content that is a JSON object, but the contentType is set to `markdown`, the editor will automatically fall back to `json` and vice versa.

-   **type**: `string`
-   **default**: `json`
-   **required**: `false`
-   **options**: `json`, `html`, `markdown`

```
const editor = new Editor({
  content: '# Hello world',
  contentType: 'markdown',
})
```

## [](#command-options)Command Options

### [](#setcontentcontent-options)`setContent(content, options)`

Set editor content from Markdown.

```
editor.commands.setContent(
  content: string,
  options?: {
    contentType?: string,
    emitUpdate?: boolean,
    parseOptions?: ParseOptions,
  }
): boolean
```

#### [](#parameters)Parameters

-   **`content`**: The Markdown string to set
-   **`options.contentType`**: The type of content inserted, can be `json`, `html` or `markdown`. Autodetects if formats don't match (default: `json`)
-   **`options.emitUpdate`**: Whether to emit an update event (default: `true`)
-   **`options.parseOptions`**: Additional parse options

#### [](#returns)Returns

`boolean` - Whether the command succeeded

#### [](#example)Example

```
editor.commands.setContent('# New Content\n\nThis is **bold**.', { contentType: 'markdown' })
```

* * *

### [](#insertcontentvalue-options)`insertContent(value, options)`

Insert Markdown content at the current selection.

```
editor.commands.insertContent(
  value: string,
  options?: {
    contentType?: string,
    parseOptions?: ParseOptions,
    updateSelection?: boolean,
  }
): boolean
```

#### [](#parameters)Parameters

-   **`value`**: The Markdown string to insert
-   **`options.contentType`**: The type of content inserted, can be `json`, `html` or `markdown`. Autodetects if formats don't match (default: `json`)
-   **`options.updateSelection`**: Whether to update selection after insert
-   **`options.parseOptions`**: Additional parse options

#### [](#returns)Returns

`boolean` - Whether the command succeeded

#### [](#example)Example

```
editor.commands.insertContent('**Bold text** at cursor', { contentType: 'markdown' })
```

* * *

### [](#insertcontentatposition-value-options)`insertContentAt(position, value, options)`

Insert Markdown content at a specific position.

```
editor.commands.insertContentAt(
  position: number | Range,
  value: string,
  options?: {
    contentType?: string,
    parseOptions?: ParseOptions,
    updateSelection?: boolean,
  }
): boolean
```

#### [](#parameters)Parameters

-   **`position`**: Position (number) or range (`{ from, to }`)
-   **`value`**: The Markdown string to insert
-   **`options.contentType`**: The type of content inserted, can be `json`, `html` or `markdown`. Autodetects if formats don't match (default: `json`)
-   **`options.updateSelection`**: Whether to update selection after insert
-   **`options.parseOptions`**: Additional parse options

#### [](#returns)Returns

`boolean` - Whether the command succeeded

#### [](#example)Example

```
// Insert at position
editor.commands.insertContentAt(10, '## Heading', { contentType: 'markdown' })

// Replace range
editor.commands.insertContentAt({ from: 10, to: 20 }, '**replacement**', { contentType: 'markdown' })
```

* * *

## [](#extension-spec)Extension Spec

The extension spec also gets extended with the following options:

### [](#markdowntokenname)`markdownTokenName`

The name of the token used for Markdown parsing.

-   **type**: `string`
-   **default**: `undefined`
-   **required**: `false`

```
const CustomNode = Node.create({
  // ...

  markdownTokenName: 'custom_token',
})
```

### [](#parsemarkdown)`parseMarkdown`

A function to customize how Markdown tokens are parsed from Markdown token into ProseMirror nodes.

-   **type**: `(token: MarkdownToken, helpers: MarkdownParseHelpers) => ProseMirrorNode[] | null`
-   **default**: `undefined`
-   **required**: `false`

```
const CustomNode = Node.create({
  // ...

  parseMarkdown: (token, helpers) => {
    return {
      type: 'customNode',
      attrs: { type: token.type },
      content: helpers.parseChildren(token.tokens || [])
    }
  },
})
```

### [](#rendermarkdown)`renderMarkdown`

A function to customize how ProseMirror nodes are rendered to Markdown tokens.

-   **type**: `(node: JSONContent, helpers: MarkdownRenderHelpers, context: RenderContext) => string | null`
-   **default**: `undefined`
-   **required**: `false`

```
const CustomNode = Node.create({
  // ...

  renderMarkdown: (node, helpers, context) => {
    const content = helpers.renderChildren(node.content, context)

    return `[${context.parentType}] ${content}`
  },
})
```

### [](#markdowntokenizer)`markdownTokenizer`

A tokenizer configuration object that creates a custom tokenizer to turn Markdown string into tokens.

-   **type**: `object`
-   **default**: `undefined`
-   **required**: `false`

```
const CustomNode = Node.create({
  // ...

  // example tokenizer that matches ::custom text::
  markdownTokenizer: {
    name: 'custom_token',
    level: 'inline',
    start(src) { return src.indexOf('::') },
    tokenizer(src, tokens) {
      const rule = /^::(.*?)::/
      const match = rule.exec(src)
      if (match) {
        return {
          type: 'custom_token',
          raw: match[0],
          text: match[1].trim(),
        }
      }
    },
  },
})
```

### [](#markdownoptions)`markdownOptions`

A optional object to pass additional options to the Markdown parser and serializer.

-   **type**: `object`
-   **default**: `undefined`
-   **required**: `false`

```
const CustomNode = Node.create({
  // ...

  markdownOptions: {
    indentsContent: true, // this setting will cause the indent level in the render context to increase inside this node
  }
})
```
