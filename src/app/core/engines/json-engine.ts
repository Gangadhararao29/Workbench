export interface JsonFormatOptions {
  indent?: number | string;
  sortKeys?: boolean;
  compact?: boolean;
}

export interface JsonParseResult<T = any> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Single source of truth for formatting JSON across Workbench.
 * Supports string input, object input, custom indentation (numbers or '2 spaces'/'4 spaces'),
 * compact minification, and recursive key sorting.
 */
export function formatJson(source: string | unknown, options: JsonFormatOptions = {}): string {
  let value: unknown;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      throw new Error('Input is empty.');
    }
    value = JSON.parse(trimmed);
  } else {
    value = source;
  }

  if (options.sortKeys) {
    value = sortJsonKeys(value);
  }

  if (options.compact) {
    return JSON.stringify(value);
  }

  let indent: number | string = 2;
  if (typeof options.indent === 'number') {
    indent = options.indent;
  } else if (typeof options.indent === 'string') {
    if (options.indent === '4 spaces' || options.indent === '4') {
      indent = 4;
    } else if (options.indent === 'Tab' || options.indent === '\t') {
      indent = '\t';
    } else {
      indent = 2;
    }
  }

  return JSON.stringify(value, null, indent);
}

/**
 * Minify JSON into a single line compact string.
 */
export function minifyJson(source: string | unknown): string {
  return formatJson(source, { compact: true });
}

/**
 * Convenience method for formatting with standard 2-space or custom indent.
 */
export function beautifyJson(source: string | unknown, indent: number = 2): string {
  return formatJson(source, { indent, compact: false });
}

/**
 * Validate that a string is valid JSON. Throws a descriptive Error if invalid.
 */
export function validateJson(source: string): void {
  if (!source || !source.trim()) {
    throw new Error('JSON input is empty.');
  }
  JSON.parse(source);
}

/**
 * Safely parse JSON without throwing.
 */
export function safeJsonParse<T = any>(source: string, fallback?: T): JsonParseResult<T> {
  try {
    const data = JSON.parse(source) as T;
    return { valid: true, data };
  } catch (err) {
    return {
      valid: false,
      data: fallback,
      error: (err as Error).message
    };
  }
}

/**
 * Recursively sorts all keys in an object or array of objects alphabetically.
 */
export function sortJsonKeys<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item)) as unknown as T;
  }

  const sortedObj: Record<string, any> = {};
  const keys = Object.keys(value as Record<string, any>).sort();

  for (const key of keys) {
    sortedObj[key] = sortJsonKeys((value as Record<string, any>)[key]);
  }

  return sortedObj as T;
}
