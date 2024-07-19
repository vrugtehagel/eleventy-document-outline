import { RenderPlugin } from "npm:@11ty/eleventy@^3.0.0-alpha.15";

export async function renderTemplate(
  template: string | { lang: string; source: string },
  data: { headers: Array<{ id: string; text: string; tag: string }> },
): Promise<string> {
  const renderer = typeof template == "string"
    ? await RenderPlugin.File(template)
    : await RenderPlugin.String(template.source, template.lang);
  return await renderer(data);
}
