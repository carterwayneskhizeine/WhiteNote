# Markdown Extension API

## [](#extension-configuration)Extension Configuration

### [](#markdownconfigureoptions)`Markdown.configure(options)`

Configure the Markdown extension with custom options.

```
Markdown.configure({
  indentation?: {
    style?: 'space' | 'tab'
    size?: number
  },
  marked?: typeof marked,
  markedOptions?: MarkedOptions,
})
```

#### [](#parameters)Parameters

-   **`indentation`** (optional)
    
    -   `style`: Indentation character: `'space'` or `'tab'`. Default: `'space'`
    -   `size`: Number of indentation characters. Default: `2`
-   **`marked`** (optional)
    
    -   Custom MarkedJS instance to use for parsing
-   **`markedOptions`** (optional)
    
    -   Options passed to `marked.setOptions()`
    -   See [marked documentation](https://marked.js.org/using_advanced#options)

#### [](#example)Example

```
import { Markdown } from '@tiptap/markdown'

const markdown = Markdown.configure({
  indentation: {
    style: 'space',
    size: 4,
  },
  markedOptions: {
    gfm: true,
    breaks: false,
  },
})
```
