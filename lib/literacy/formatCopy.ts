export function formatCopy(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), value), template);
}
