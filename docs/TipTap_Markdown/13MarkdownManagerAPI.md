# MarkdownManager API

The `MarkdownManager` class is a stand-alone class that provides support for parsing and serializing Markdown content into Tiptap's document model.

## [](#methods)Methods

### [](#constructor)Constructor

```
new MarkdownManager(options?: {
  marked?: typeof marked,
  markedOptions?: MarkedOptions,
  indentation?: {
    style?: 'space' | 'tab',
    size?: number,
  },
})
```

### [](#markdownmanagerhasmarked)`MarkdownManager.hasMarked()`

Returns `true` or `false` depending on whether the `marked` library is available.

-   **returns**: `boolean`

```
const manager = new MarkdownManager()
manager.hasMarked() // true or false
```

### [](#markdownmanagerregisterextension)`MarkdownManager.registerExtension()`

Registers a Tiptap extension to be used for parsing and serializing Markdown content.

-   **returns**: `void`
-   **parameters**:
    -   `extension`: A Tiptap extension to register.

```
const manager = new MarkdownManager()
manager.registerExtension(MyCustomExtension)
```

### [](#markdownmanagerparse)`MarkdownManager.parse()`

Parses a Markdown string into a Tiptap document.

-   **returns**: `JSON` - The Tiptap document in JSON format.
-   **parameters**:
    -   `markdown`: A string containing the Markdown content to parse.

```
const manager = new MarkdownManager()
const doc = manager.parse('# Hello World')
```

### [](#markdownmanagerserialize)`MarkdownManager.serialize()`

Serializes a Tiptap document or JSON content into a Markdown string.

-   **returns**: `string` - The serialized Markdown string.
-   **parameters**:
    -   `content`: A Tiptap document or JSON content to serialize.

```
const manager = new MarkdownManager()
const markdown = manager.serialize(doc)
```

### [](#markdownmanagerrendernodetomarkdown)`MarkdownManager.renderNodeToMarkdown()`

Renders a single ProseMirror node to its Markdown representation.

-   **returns**: `string` - The Markdown string for the given node.
-   **parameters**:
    -   **node**: A ProseMirror node to render.
    -   **parentNode**: (optional) The parent ProseMirror node.
    -   **index**: (optional) The index of the node within its parent.
    -   **level**: (optional) The nesting level of the node.

```
const manager = new MarkdownManager()
const markdown = manager.renderNodeToMarkdown(node)
```

### [](#markdownmanagerrendernodes)`MarkdownManager.renderNodes()`

Renders an array of ProseMirror nodes to their combined Markdown representation.

-   **returns**: `string` - The combined Markdown string for the given nodes.
-   **parameters**:
    -   **nodes**: An array of ProseMirror nodes to render.
    -   **parentNode**: (optional) The parent ProseMirror node.
    -   **separator**: (optional) A string to separate the rendered nodes. Defaults to `''`
    -   **level**: (optional) The nesting level of the nodes. Defaults to `0`.
    -   **level**: `number` - The nesting level of the nodes. Defaults to `0`.

## [](#properties)Properties

### [](#markdowninstance)`Markdown.instance`

The MarkedJS instance used for parsing Markdown content.

### [](#markdownindentcharacter)`Markdown.indentCharacter`

The character used for indentation in lists. Defaults to a space (`' '`).

### [](#markdownindentstring)`Markdown.indentString`

The string used for indentation in lists. Defaults to two spaces (`' '`).

