import * as HTMLParser from "npm:node-html-parser@^6.1";
import { crypto } from "jsr:@std/crypto@^0.224";

/** Allowed header tag names, lowercased */
const HEADERS: string[] = ["h1", "h2", "h3", "h4", "h5", "h6", "h7"] as const;
/** Default options, used if not provided explicitly */
const DEFAULTS: EleventyDocumentOutlineOptions = {
  headers: ["h1", "h2", "h3"],
  output: ({ id, text, header }) =>
    `<a href="#${id}" class="link-${header}">${text}</a>`,
};

/** The Eleventy config object, should be a better type than "any" but alas */
type EleventyConfig = any;
/** UUIDs are rendered by the shortcode and then replaced in a transform at build time */
type UUID = string;
/** Allowed header tag names, lowercased, as a type */
type LowerCaseHeader = typeof HEADERS[number];
/** Allowed header tag names, uppercased */
type UpperCaseHeader = "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "H7";
/** Allowed header tag names, case-insensitive */
type Header = LowerCaseHeader | UpperCaseHeader;
/** The options. All fields are optional through Partial<…> */
type EleventyDocumentOutlineOptions = {
  headers: Header[];
  output: (info: { id: string; text: string; header: Header }) => string;
};

/**
 * Receives a user-provided header and returns a normalized (lowercased) header.
 * Throws if the argument is not a valid header.
 */
function normalize(header: string): LowerCaseHeader {
  const lowerCase = header.toLowerCase();
  if (HEADERS.includes(lowerCase)) return lowerCase;
  throw new Error(`Invalid header "${header}" found.`);
}

/** The plugin itself, with an optional options object as second argument. */
export default function EleventyDocumentOutline(
  config: EleventyConfig,
  options: Partial<EleventyDocumentOutlineOptions> = {},
) {
  const normalizedOptions = Object.assign({}, DEFAULTS, options);
  const memory = new Map<UUID, LowerCaseHeader[]>();

  /** The {% outline %} shortcode, with optional configurable headers */
  config.addShortcode("outline", function (...headers: Header[]) {
    const uuid = crypto.randomUUID();
    const normalized = headers.length == 0
      ? normalizedOptions.headers
      : headers.map((header: Header) => normalize(header));
    memory.set(uuid, normalized);
    return uuid;
  });

  /** The transform responsible for actually generating and rendering the links */
  config.addTransform(
    "document-outline",
    async function (this: any, content: string) {
      const outputPath = this.page.outputPath as string;
      if (!outputPath.endsWith(".html")) return content;

      const included = [...memory].filter(([uuid]) => content.includes(uuid));
      const necessaryHeaders = included.flatMap(([uuid, headers]) => headers);
      const uniqueHeaders = [...new Set(necessaryHeaders)];
      const root = HTMLParser.parse(content);
      const selector = uniqueHeaders.join(",");
      const headerElements = [...root.querySelectorAll(selector)];
      const matches = headerElements.map((element) => {
        const id: string = element.id;
        if (!id) return null;
        if (element.getAttribute("data-outline-ignore") != null) return null;
        const text: string = element.rawText;
        const header: LowerCaseHeader = element.tagName.toLowerCase();
        const output = normalizedOptions.output({ id, text, header });
        return [header, output];
      }).filter((match) => match != null) as Array<[LowerCaseHeader, string]>;

      let result = content;
      for (const [uuid, headers] of included) {
        const normalized = headers.map((header) => normalize(header));
        const output = matches
          .filter(([header]) => normalized.includes(header))
          .map(([header, output]) => output)
          .join("");
        result = result.replaceAll(uuid, output);
      }
      return result;
    },
  );
}
