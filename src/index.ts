import fs from "node:fs/promises";
import { RenderPlugin } from "npm:@11ty/eleventy@^3.0.0-alpha.15";
import * as HTMLParser from "npm:node-html-parser@^6.1";
import type { EleventyDocumentOutlineOptions } from "./options.ts";
import { findHeaders } from "./find-headers.ts";
import { renderTemplate } from "./render-template.ts";

/** The Eleventy config object, should be a better type than "any" but alas */
type EleventyConfig = any;

/** We wrap the RenderPlugin with our own function, so Eleventy sees it as a
 * different plugin. We also rename the shortcodes so that users are not
 * bothered by the addition of the plugin under the hood. */
function RenderPluginForEleventyDocumentOutline(config: EleventyConfig) {
  return RenderPlugin(config, {
    tagName: null,
    tagNameFile: "eleventyDocumentOutlineRender",
    accessGlobalData: true,
  });
}

export function EleventyDocumentOutline(
  config: EleventyConfig,
  options: EleventyDocumentOutlineOptions = {},
) {
  /** We need this for the shortcode. If it already exists, then adding it
   * again is fine and does nothing. */
  config.addPlugin(RenderPluginForEleventyDocumentOutline);

  const {
    headers: defaultSelector = "h1,h2,h3",
    template: defaultTemplate = {
      lang: "liquid",
      source: `
        {% for header in headers %}
          <a href="#{{ header.id }}" class="link-{{ header.tag }}">
            {{ header.text | escape }}
          </a>
        {% endfor %}
      `,
    },
    mode: defaultMode = "optin",
    slugify = config.getFilter("slugify"),
    tmpDir = "tmpDirEleventyDocumentOutline",
  } = options;

  const memory = new Map<string, {
    page: any;
    selector: string;
    template: string | { lang: string; source: string };
    mode: "optin" | "dynamic";
  }>();

  /** Support syntax like:
   * {% outline "h2,h3", "templates/foo.liquid" %} */
  config.addShortcode("outline", function (
    this: any,
    selector: string = defaultSelector,
    template: false | string | { lang: string; source: string } = false,
    mode: "optin" | "dynamic" = defaultMode,
  ) {
    template ||= defaultTemplate;
    const uuid = crypto.randomUUID();
    const page = this.page;
    memory.set(uuid, { page, selector, template, mode });
    return uuid;
  });

  /** A filter to get access to the underlying generated content
   * and an array of headers. This is primarily useful for when you want to
   * define a template inline instead of a separate file. Unfortunately, this
   * cannot exist as a shortcode, since the entire page needs to render first
   * before it can be scanned for headers. Either way, it exists as a filter,
   * since then the content to scan is given. For example:
   * {% assign outline = content | outline: "h2,h3", "dynamic" %}
   * …
   * {{ outline.content }}
   * …
   * {% for header in outline.headers %}…{% endfor %}
   */
  config.addFilter("outline_parse", function (
    content: string,
    selector: string = defaultSelector,
    mode: "optin" | "dynamic" = defaultMode,
  ): {
    content: string;
    headers: Array<{ id: string; text: string; tag: string }>;
  } {
    const root = HTMLParser.parse(content);
    const {
      headers,
      markupChanged,
    } = findHeaders(root, selector, mode, slugify);
    return {
      content: markupChanged ? root.toString() : content,
      headers,
    };
  });

  config.addFilter("outline", async function (
    this: any,
    content: string,
    selector: string = defaultSelector,
    template: string | { lang: string; source: string } = defaultTemplate,
  ): Promise<string> {
    const root = HTMLParser.parse(content);
    const { headers } = findHeaders(root, selector, "optin", slugify);
    const data = { headers };
    return await renderTemplate.call(this, config, template, tmpDir, data);
  });

  /** If we have shortcodes, then we process HTML files, find UUIDs inside them
   * and replace them with the rendered content. If any of them are in
   * `"dynamic`" mode, then we also add IDs to the headers. For example:
   * {% outline "h2,h3", "template/foo.liquid", "dynamic" %} */
  config.addTransform("document-outline", async function (
    this: any,
    content: string,
  ): Promise<string> {
    const outputPath = this.page.outputPath as string;
    if (!outputPath.endsWith(".html")) return content;
    if (![...memory].some(([uuid]) => content.includes(uuid))) {
      return content;
    }
    const root = HTMLParser.parse(content);
    const replacements = new Map<string, string>();
    let alteredParsedHTML = false;
    await Promise.all([...memory].map(async ([uuid, context]) => {
      if (!content.includes(uuid)) return;
      const { selector, mode, template } = context;
      const {
        headers,
        markupChanged,
      } = findHeaders(root, selector, mode, slugify);
      const data = { headers };
      alteredParsedHTML ||= markupChanged;
      const rendered = await renderTemplate
        .call(this, config, template, tmpDir, data);
      replacements.set(uuid, rendered);
    }));
    let result = alteredParsedHTML ? root.toString() : content;
    for (const [uuid, replacement] of replacements) {
      result = result.replace(uuid, replacement);
    }
    return result;
  });

  config.events.addListener("eleventy.after", async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
}
