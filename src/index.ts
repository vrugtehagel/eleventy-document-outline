import fs from "node:fs/promises";
import { RenderPlugin } from "npm:@11ty/eleventy@^3.0.0-alpha.15";
import * as HTMLParser from "npm:node-html-parser@^6.1";
import type { EleventyDocumentOutlineOptions } from "./options.ts";

/** The Eleventy config object, should be a better type than "any" but alas */
type EleventyConfig = any;

/** The shape of an Eleventy `page` object. */
type EleventyPage = any;

/** Unique UUIDs are generated for each use of an outline. We first output
 * UUIDs, and once the whole page is rendering, we can process headers and
 * replace the UUIDs with content. */
type UUID = string;

/** We wrap the RenderPlugin with our own function, so Eleventy sees it as a
 * different plugin. We also rename the shortcodes so that users are not
 * bothered by the addition of the plugin under the hood. */
function RenderPluginForEleventyDocumentOutline(config: EleventyConfig){
  return RenderPlugin(config, {
    tagName: null,
    tagNameFile: "eleventyDocumentOutlineRender",
    accessGlobalData: true,
  })
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
      `
    },
    mode: defaultMode = "optin",
    slugify = config.getFilter("slugify"),
    tmpDir = "tmpDirEleventyDocumentOutline",
  } = options;

  const memory = new Map<UUID, {
    page: EleventyPage;
    selector: string;
    template: string | { lang: string, source: string };
    mode: "optin" | "dynamic";
  }>();

  const templateFiles = new Map<{ lang: string, source: string }, string>();

  /** Support syntax like:
   * {% outline "h2,h3", "templates/foo.liquid" %} */
  config.addShortcode("outline", function(
    this: { page: EleventyPage },
    selector: string = defaultSelector,
    template: false | string | { lang: string, source: string } = false,
    mode: "optin" | "dynamic" = defaultMode,
  ){
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
   * */
  config.addFilter("outline", function(
    content: string,
    selector: string = defaultSelector,
    mode: "optin" | "dynamic" = defaultMode,
  ): {
    content: string,
    headers: Array<{ id: string, text: string, tag: string }>
  } {
    const root = HTMLParser.parse(content);
    const rawHeaders = [...root.querySelectorAll(selector)];
    const headers = [];
    let createdId = false;
    for(const rawHeader of rawHeaders){
      if(!rawHeader.getAttribute("id")){
        if(mode != "dynamic") continue;
        createdId = true;
      }
      const text: string = rawHeader.rawText;
      const id: string = rawHeader.getAttribute("id") || slugify(text);
      const tag: string = rawHeader.tagName.toLowerCase();
      headers.push({ id, text, tag });
    }
    return {
      content: createdId ? root.toString() : content,
      headers
    };
  });

  let tmpDirCreated = false;

  /** If we have shortcodes, then we process HTML files, find UUIDs inside them
   * and replace them with the rendered content. If any of them are in
   * `"dynamic`" mode, then we also add IDs to the headers. For example:
   * {% outline "h2,h3", "template/foo.liquid", "dynamic" %} */
  config.addTransform("document-outline", async function(
    this: { page: EleventyPage },
    content: string,
  ): Promise<string> {
    const outputPath = this.page.outputPath as string;
    if(!outputPath.endsWith(".html")) return content;
    if(![...memory].some(([uuid]) => content.includes(uuid))){
      return content;
    }
    const root = HTMLParser.parse(content);
    const renderFile = config.getShortcode("eleventyDocumentOutlineRender");
    const replacements = new Map<UUID, string>();
    let alteredParsedHTML = false;
    for(const [uuid, context] of memory){
      if(!content.includes(uuid)) continue;
      const { selector, mode, template } = context;
      const rawHeaders = [...root.querySelectorAll(selector)];
      const headers = [];
      for(const rawHeader of rawHeaders){
        if(!rawHeader.getAttribute("id") && mode != "dynamic") continue;
        const text: string = rawHeader.rawText;
        if(!rawHeader.getAttribute("id")){
          rawHeader.setAttribute("id", slugify(text));
          alteredParsedHTML = true;
        }
        const id: string = rawHeader.getAttribute("id") ?? "";
        const tag: string = rawHeader.tagName.toLowerCase();
        headers.push({ text, id, tag });
      }
      const data = { headers };
      if(typeof template != "string"){
        if(!templateFiles.has(template)){
          if(!tmpDirCreated){
            await fs.mkdir(tmpDir, { recursive: true });
            tmpDirCreated = true;
          }
          const fileUUID = crypto.randomUUID();
          const filePath = `${tmpDir}/${fileUUID}.${template.lang}`;
          await fs.writeFile(filePath, template.source);
          templateFiles.set(template, filePath);
        }
      }
      const path = typeof template == "string"
        ? template
        : templateFiles.get(template);
      const rendered = await renderFile.call(this, path, data);
      replacements.set(uuid, rendered);
    }
    let result = alteredParsedHTML ? root.toString() : content;
    for(const [uuid, replacement] of replacements){
      result = result.replace(uuid, replacement);
    }
    return result;
  });

  config.events.addListener("eleventy.after", async (event: any) => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  })
}
