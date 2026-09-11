import { JSONPath } from 'jsonpath-plus';
import { getLocation } from 'jsonc-parser';

export interface JsonPathOptions {
  resultType?: 'value' | 'path' | 'pointer';
  wrap?: boolean;
}

export interface JsonPathEvaluation {
  formatted: string;
  count: number;
  results: unknown;
}

/**
 * Evaluates a JSONPath expression against a JSON source string using jsonpath-plus.
 */
export function evaluateJsonPathDetailed(
  source: string,
  path: string,
  options: JsonPathOptions = {}
): JsonPathEvaluation {
  if (!source || !source.trim()) {
    return { formatted: '', count: 0, results: null };
  }

  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return { formatted: 'Please enter a JSONPath expression.', count: 0, results: null };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(source);
  } catch (err) {
    throw new Error(`Invalid JSON source: ${(err as Error).message}`);
  }

  try {
    const resultType = options.resultType ?? 'value';
    const wrap = options.wrap ?? false;

    // Use wrap: true internally so we always have an array to count matches
    const rawMatches = JSONPath({
      path: trimmedPath,
      json: parsed,
      resultType,
      wrap: true,
    }) as any[];

    const count = Array.isArray(rawMatches) ? rawMatches.length : (rawMatches !== undefined ? 1 : 0);

    if (count === 0) {
      return { formatted: 'No match found.', count: 0, results: [] };
    }

    // When wrap is false and there is only 1 match, return the direct value
    const finalResult = wrap ? rawMatches : (count === 1 ? rawMatches[0] : rawMatches);
    const formatted = typeof finalResult === 'string' && resultType === 'value'
      ? `"${finalResult}"`
      : JSON.stringify(finalResult, null, 2);

    return { formatted, count, results: finalResult };
  } catch (err) {
    throw new Error(`Invalid JSONPath expression: ${(err as Error).message}`);
  }
}

/**
 * Convenience wrapper returning formatted JSON result string.
 */
export function evaluateJsonPath(
  source: string,
  path: string,
  options: JsonPathOptions = {}
): string {
  return evaluateJsonPathDetailed(source, path, options).formatted;
}

/**
 * Converts path segments (e.g. from jsonc-parser) into a valid JSONPath expression.
 * e.g. ['users', 0, 'name'] -> '$.users[0].name'
 * e.g. ['complex-prop', 'sub prop'] -> '$[\'complex-prop\'][\'sub prop\']'
 */
export function segmentsToJsonPath(segments: (string | number)[]): string {
  if (!segments || segments.length === 0) return '$';
  return (
    '$' +
    segments
      .map((segment) => {
        if (typeof segment === 'number') {
          return `[${segment}]`;
        }
        // Valid JS identifier format
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) {
          return `.${segment}`;
        }
        return `['${String(segment).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`;
      })
      .join('')
  );
}

/**
 * Calculates the JSONPath expression for the node at the specified character offset in a JSON string.
 */
export function getJsonPathAtOffset(source: string, offset: number): string {
  if (!source || !source.trim()) return '$';
  const location = getLocation(source, offset);
  return segmentsToJsonPath(location.path);
}
