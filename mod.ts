import * as HTMLParser from "npm:node-html-parser@^6.1";

const HEADERS: string[] = ["h1", "h2", "h3", "h4", "h5", "h6", "h7"] as const;
const DEFAULTS: EleventyDocumentOutlineOptions = {
  headers: ["h1", "h2", "h3"],
  output: ({ id, text, header }) =>
    `<a href="#${id}" class="link-${header}">${text}</a>`,
};

type EleventyConfig = any;
type UUID = string;
type LowerCaseHeader = typeof HEADERS[number];
type UpperCaseHeader = "H1" | "H2" | "H3" | "H4" | "H5" | "H6" | "H7";
type Header = LowerCaseHeader | UpperCaseHeader;
type EleventyDocumentOutlineOptions = {
  headers: Header[];
  output: (info: { id: string; text: string; header: Header }) => string;
};

function normalize(header: string): LowerCaseHeader {
  const lowerCase = header.toLowerCase();
  if (HEADERS.includes(lowerCase)) return lowerCase;
  throw new Error(`Invalid header "${header}" found.`);
}

export default function EleventyDocumentOutline(
  config: EleventyConfig,
  options: Partial<EleventyDocumentOutlineOptions> = {},
) {
  const normalizedOptions = Object.assign({}, DEFAULTS, options);
  const memory = new Map<UUID, LowerCaseHeader[]>();

  config.addShortcode("outline", function (...headers: Header[]) {
    const uuid = crypto.randomUUID();
    const normalized = headers.length == 0
      ? normalizedOptions.headers
      : headers.map((header: Header) => normalize(header));
    memory.set(uuid, normalized);
    return uuid;
  });

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
