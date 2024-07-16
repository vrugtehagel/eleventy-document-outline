import fs from "node:fs/promises";

const templateMap = new Map<{ lang: string; source: string }, string>();

export async function renderTemplate(
  this: any,
  config: any,
  template: string | { lang: string; source: string },
  tmpDir: string,
  data: { headers: Array<{ id: string; text: string; tag: string }> },
): Promise<string> {
  const renderFile = config.getShortcode("eleventyDocumentOutlineRender");
  if (typeof template == "string") {
    return await renderFile.call(this, template, data);
  }
  if (!templateMap.has(template)) {
    await fs.mkdir(tmpDir, { recursive: true });
    const { lang, source } = template;
    const uuid = crypto.randomUUID();
    const filePath = `${tmpDir}/${uuid}.${lang}`;
    await fs.writeFile(filePath, source);
    templateMap.set(template, filePath);
  }
  const path = templateMap.get(template);
  return await renderFile.call(this, path, data);
}
