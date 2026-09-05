import { formatJson } from './json-engine';

export interface CsharpToJsonOptions {
  indent?: number | string;
  compact?: boolean;
}

/**
 * Pure engine for parsing C# class or record definitions and converting them to sample JSON.
 */
export function convertCsharpToJson(source: string, options: CsharpToJsonOptions = {}): string {
  const classMatch = source.match(/(?:class|record)\s+(\w+)[^{]*\{/i);
  const bodyStart = classMatch?.index === undefined ? -1 : classMatch.index + classMatch[0].length - 1;
  const bodyEnd = bodyStart >= 0 ? findMatchingBrace(source, bodyStart) : -1;

  if (!classMatch || bodyEnd < 0) {
    throw new Error('No C# class or record found.');
  }

  const values: Record<string, unknown> = {};
  const properties = /(?:public|internal|private)?\s*(\w+(?:<[^>]+>)?(?:\[\])?)(\?)?\s+(\w+)\s*(?:\{|;)/g;
  let match: RegExpExecArray | null;

  while ((match = properties.exec(source.slice(bodyStart + 1, bodyEnd)))) {
    const propName = match[3].charAt(0).toLowerCase() + match[3].slice(1);
    values[propName] = sampleValue(match[1], Boolean(match[2]));
  }

  return formatJson(values, {
    indent: options.indent ?? 2,
    compact: options.compact ?? false,
  });
}

function findMatchingBrace(source: string, openingBrace: number): number {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return index;
  }
  return -1;
}

function sampleValue(type: string, nullable: boolean): unknown {
  if (nullable) return null;
  const collection = type.match(/^(?:List|ICollection|IEnumerable)<(.+)>$/);
  if (collection) return [sampleValue(collection[1], false)];
  if (type.endsWith('[]')) return [sampleValue(type.slice(0, -2), false)];
  if (/^(bool|boolean)$/i.test(type)) return true;
  if (/^(int|long|short|byte|float|double|decimal)$/i.test(type)) return 0;
  if (/^(DateTime|DateTimeOffset)$/i.test(type)) return '2026-01-01T00:00:00Z';
  if (/^Guid$/i.test(type)) return '00000000-0000-0000-0000-000000000000';
  return 'string';
}
