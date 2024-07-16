export function findHeaders(
  root: any,
  selector: string,
  mode: "optin" | "dynamic",
  slugify: (text: string) => string,
): {
  headers: Array<{ id: string; text: string; tag: string }>;
  markupChanged: boolean;
} {
  const rawHeaders = [...root.querySelectorAll(selector)];
  const headers = [];
  let markupChanged = false;
  for (const rawHeader of rawHeaders) {
    if (!rawHeader.getAttribute("id")) {
      if (mode != "dynamic") continue;
      markupChanged = true;
    }
    const text: string = rawHeader.rawText;
    const id: string = rawHeader.getAttribute("id") || slugify(text);
    const tag: string = rawHeader.tagName.toLowerCase();
    headers.push({ id, text, tag });
  }
  return { headers, markupChanged };
}
