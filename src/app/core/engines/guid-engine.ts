export type GuidFormat = 'plain' | 'sql' | 'csharp' | 'json' | 'typescript';
export type GuidCasing = 'lower' | 'upper';

export interface GuidGeneratorOptions {
  count?: number;
  casing?: GuidCasing;
  format?: GuidFormat;
}

export function generateGuids(count: number): string[] {
  const safeCount = Math.max(1, Math.min(1000, Number(count) || 1));
  return Array.from({ length: safeCount }, () => crypto.randomUUID());
}

export function formatGuids(
  guids: string[],
  format: GuidFormat = 'plain',
  casing: GuidCasing = 'lower',
): string {
  const normalized =
    casing === 'upper' ? guids.map((v) => v.toUpperCase()) : guids.map((v) => v.toLowerCase());
  const quoted = normalized.map((value) => `'${value}'`);

  switch (format) {
    case 'sql':
      return `IN (\n  ${quoted.join(',\n  ')}\n)`;
    case 'csharp':
      return `new[]\n{\n${normalized.map((value) => `  Guid.Parse("${value}"),`).join('\n')}\n}`;
    case 'json':
      return JSON.stringify(normalized, null, 2);
    case 'typescript':
      return `[\n${quoted.map((value) => `  ${value},`).join('\n')}\n]`;
    case 'plain':
    default:
      return normalized.join('\n');
  }
}
