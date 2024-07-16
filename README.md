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

In your Eleventy configuration file (usually `.eleventy.js`), import/require the
module and add the plugin using `.addPlugin()`:

```js
import EleventyDocumentOutline from "eleventy-document-outline";

export default function (eleventyConfig) {
  // …
  eleventyConfig.addPlugin(EleventyDocumentOutline, {
    headers: ["h1", "h2", "h3"],
  });
  // …
}
```

As shown above, there are additional options one may pass as second argument to
the `.addPlugin()` call, as an object. See the `EleventyDocumentOutlineOptions`
type for more information.

## Usage

This plugin provides three ways of outlining a document.

### Filter

```liquid
{{ content | outline }}
{{ content | outline: "h1, h2, h3, h4", "templates/outline.liquid" }}
```

First, the `outline` filter. It accepts two (optional) arguments; first, the
selector to find headers with, and second, the template to use, as a file path.
In general, it should be applied to the `content` variable, though it may be
applied to any string of HTML.

### Shortcode

```liquid
{% outline %}
{% outline "h1, h2", "my/outline_template.njk", "dynamic" %}
```

The filter needs a string of HTML to scan for headers. Sometimes, we piece
together a document and need to scan the resulting document for headers. To do
this, there's a shortcode `{% outline %}`. It waits for the whole document to
render, and subsequently substitutes the specified outline afterwards. The
shortcode accepts three (optional) arguments; first, the selector to use to find
headers. Second, a template as a file path, or `false` to use the default
template. Third, the `mode` to run in; either `"optin"` or `"dynamic"`. The
former is the default, and requires you to add `id` attributes to your headers
in order to opt-in to being added to the document outline. The alternative is
`"dynamic"`, which will add `id` attributes to headers dynamically based on the
`slugify` option provided in your config (the default `slugify` filter by
default). The `"dynamic"` mode is slower than `"optin"`; avoid it if you can.
For example, using a markdown plugin to generate the IDs is more efficient.

### Low-level filter

```liquid
{% assign outline = content | outline_parse: "h1, h2, h3", "optin" %}
{{ outline.content }}
<nav>
  {% for header in outline.headers %}
    <a href="#{{ header.id }}">{{ header.text }}</a>
  {% endfor %}
</nav>
```

It is also possible to parse and scan a piece of HTML, without processing it
through a template. For this, use the `outline_parse` filter. It accepts two
(optional) arguments; a selector, and a mode (either `"optin"` or `"dynamic"`).
It then returns an object with a `content` key and a `headers` key. The former
represents the transformed content, in case `"dynamic"` mode was used and `id`
attributes were added. The `headers` key is an array of objects, each have an
`id`, `text` and `tag` key, all strings. These can be used to generate your own
custom markup in the file itself instead of having to create an template file or
relying on the default configuration.
