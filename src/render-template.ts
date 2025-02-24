import { RenderPlugin } from "npm:@11ty/eleventy@^3.0.0-alpha.15";

const cache = new Map<string, Promise<(data: any) => string>>();

export async function renderTemplate(
  template: string | { lang: string; source: string },
  data: { headers: Array<{ id: string; text: string; tag: string }> },
): Promise<string> {
  const key = JSON.stringify(template);
  const cached = cache.get(key);
  if (cached) return await cached.then((renderer) => renderer(data));
  const promise = typeof template == "string"
    ? RenderPlugin.File(template)
    : RenderPlugin.String(template.source, template.lang);
  cache.set(key, promise);
  const renderer = await promise;
  return await renderer(data);
}
