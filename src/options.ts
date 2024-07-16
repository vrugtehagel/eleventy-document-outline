/** An options object. Every option is optional. They represent the defaults,
 * and can be overwritten on a case-by-case basis. */
export type EleventyDocumentOutlineOptions = {
  /** A selector to identify headers with. It defaults to "h1,h2,h3".
   * Theoretically it is possible to select elements that are not headers,
   * but this is not recommended. */
  headers?: string;

  /** Either a path to an include, to render the nav items with, or an object
   * with a `lang` and `source` property to represent such a file. `lang` must
   * be a supported templating language, and `source` must be in said language.
   * By default, the following is used:
   * ```js
   * {
   *   lang: "liquid",
   *   source: `
   *     {% for header in headers %}
   *       <a
   *         href="{{ header.text | slugify }}"
   *         class="link-{{ header.tag | downcase | escape }}"
   *       >{{ header.text | escape }}</a>
   *     {% endfor %}
   *   `
   * }
   * ```
   * Whichever is chosen, the template receives one argument; `headers`. This
   * is an array of objects representing the individual headers in the
   * processed content. Each header has a `.text` property for the original
   * text contents and a `tag` property to identify the header's tag name. */
  template?: string | { lang: string; source: string };

  /** By default, this plugin will ignore headers without an `id` attribute.
   * This is so that the document outline is somewhat of an opt-in system, but
   * also because it requires modifying and re-rendering HTML to add headers.
   * However, you can choose to dynamically create `id` attributes for headers.
   * To do so, set this option to `"dynamic"`. */
  mode?: "optin" | "dynamic";

  /** If the `createIds` option is `true`, then a slugify function is needed
   * to transform text in headers to a slug to use for the `id` attribute. By
   * default, the built-in `slugify` filter is used. If desired, this can be
   * overwritten with a function here. This option is _not_ available on a
   * case-by-case basis. */
  slugify?: (input: string) => string;

  /** When using the shortcode combined with a template that is not referencing
   * a file (which includes the default configuration) a temporary directory is
   * needed to write document outline templates to in order for them to be
   * processed by Eleventy. By default, `"tmpDirEleventyDocumentOutline"` is
   * used, but it is possible to overwrite this using this option. */
  tmpDir?: string;
};
