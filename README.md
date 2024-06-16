# eleventy-document-outline

Creates a list of anchors to linkable headers.

## Installation

To install, run any of the following commands:

```bash
# For npm:
npx jsr add @vrugtehagel/eleventy-document-outline
# For yarn:
yarn dlx jsr add @vrugtehagel/eleventy-document-outline
# For pnpm:
pnpm dlx jsr add @vrugtehagel/eleventy-document-outline
# For deno:
deno add @vrugtehagel/eleventy-document-outline
```

## Config

In your Eleventy configuration file (usually `.eleventy.js`), import/require the module and add the plugin using `.addPlugin()`:

```js
import EleventyDocumentOutline from 'eleventy-document-outline';

export default function(eleventyConfig){
	// …
	eleventyConfig.addPlugin(EleventyDocumentOutline);
	// …
}
```

There are additional options one may pass as second argument to the `.addPlugin()` call:

- `headers`: an array of headers to include in the document outline. By default, this is set to `['h1', 'h2', 'h3']`. Note that this can be overwritten on a case-by-case basis in the shortcode itself.
- `output`: a function receiving a single argument `{ id, text, header }`. The function must return a snippet of HTML to output, by default this is

```js
function output({ id, text, header }){
	return `<a href="#${id}" class="link-${header}">${text}</a>`,
}
```

The function runs once per header found. The `id` then matches the `id` attribute of the given header, the `header` matches the `.localName` (i.e. lowercased `.tagName`) and the `text` is the text found inside the header.

## Usage

To output the list of links, use the `{% outline %}` shortcode like so:

```liquid
	<nav id="doc-outline">
		{% outline "h2", "h3" %}
	</nav>
```

In this case, only the `h2` and `h3` elements (with `id` attributes) are included in the outline. If the arguments are left out, as in `{% outline %}`, then the default headers as configured are used (if not explicityly configured, only `h1`, `h2` and `h3` elements are included).

### Excluding a header

To exclude a header, add a `data-outline-ignore` attribute to it.

### Generating header ids

This plugin does not automatically generate `id` attributes for your headers. If this is something you want or need, use a separate plugin to generate them, such as e.g. [markdown-it-anchor](https://www.npmjs.com/package/markdown-it-anchor).
