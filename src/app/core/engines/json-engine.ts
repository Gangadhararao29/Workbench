export function formatJson(source: string, options: { indent: number; sortKeys: boolean; compact: boolean }): string {
  const value = JSON.parse(source);
  const replacer = options.sortKeys && isObject(value) ? Object.keys(value).sort() : null;
  return JSON.stringify(value, replacer, options.compact ? 0 : options.indent);
}

export function validateJson(source: string): void {
  JSON.parse(source);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
