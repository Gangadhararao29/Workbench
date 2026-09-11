import { formatJson } from './json-engine';

export interface CsharpToJsonOptions {
  indent?: number | string;
  compact?: boolean;
  casing?: 'camel' | 'pascal' | 'snake' | 'preserve';
}

interface CsharpProperty {
  name: string;
  type: string;
  nullable: boolean;
  jsonName?: string;
  defaultVal?: string;
}

interface CsharpType {
  name: string;
  kind: 'class' | 'record' | 'struct' | 'enum';
  properties: CsharpProperty[];
  enumValues?: string[];
}

/**
 * Pure engine for parsing C# class or record definitions and converting them to sample JSON.
 */
export function convertCsharpToJson(source: string, options: CsharpToJsonOptions = {}): string {
  if (!source || !source.trim()) {
    throw new Error('No C# class or record found.');
  }

  const typesMap = parseCsharpTypes(source);
  if (typesMap.size === 0) {
    throw new Error('No C# class or record found.');
  }

  // Primary/root type is the first non-enum type parsed, or fallback to first type
  let rootType: CsharpType | undefined;
  for (const t of typesMap.values()) {
    if (t.kind !== 'enum') {
      rootType = t;
      break;
    }
  }
  if (!rootType) {
    rootType = typesMap.values().next().value;
  }

  if (!rootType) {
    throw new Error('No C# class or record found.');
  }

  const casing = options.casing ?? 'camel';
  const values: Record<string, unknown> = {};

  for (const prop of rootType.properties) {
    const key = prop.jsonName || formatKey(prop.name, casing);
    values[key] = sampleValue(prop.type, prop.nullable, typesMap, casing);
  }

  return formatJson(values, {
    indent: options.indent ?? 2,
    compact: options.compact ?? false,
  });
}

function stripComments(source: string): string {
  let result = '';
  let i = 0;
  const len = source.length;
  let inString = false;
  let quoteChar = '';
  let isVerbatim = false;

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    if (inString) {
      result += ch;
      if (isVerbatim) {
        if (ch === '"') {
          if (next === '"') {
            result += next;
            i += 2;
            continue;
          } else {
            inString = false;
          }
        }
      } else {
        if (ch === '\\') {
          result += next || '';
          i += 2;
          continue;
        } else if (ch === quoteChar) {
          inString = false;
        }
      }
      i++;
      continue;
    }

    // String start
    if ((ch === '@' || ch === '$') && next === '"') {
      inString = true;
      quoteChar = '"';
      isVerbatim = ch === '@' || source.slice(i, i + 3).includes('@');
      result += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quoteChar = ch;
      isVerbatim = false;
      result += ch;
      i++;
      continue;
    }

    // Line comment
    if (ch === '/' && next === '/') {
      while (i < len && source[i] !== '\n' && source[i] !== '\r') {
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }
  return result;
}

function parseCsharpTypes(source: string): Map<string, CsharpType> {
  const clean = stripComments(source);
  const found: Array<CsharpType & { index: number }> = [];

  // 1. Positional records: public record Name(params);
  const positionalRecordRegex = /(?:public|internal|private)?\s*record\s+(?:struct\s+)?(\w+)\s*\(([^)]*)\)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = positionalRecordRegex.exec(clean))) {
    const typeName = m[1];
    const paramStr = m[2];
    const properties: CsharpProperty[] = [];

    const params = splitParameters(paramStr);
    for (const p of params) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const attrMatch = trimmed.match(/\[([^\]]+)\]/);
      const cleanParam = trimmed.replace(/\[[^\]]+\]/g, '').trim();

      const withoutDefault = cleanParam.split(/\s*=\s*/)[0].trim();
      const nameMatch = withoutDefault.match(/\b([a-zA-Z_@][a-zA-Z0-9_]*)$/);
      if (!nameMatch) continue;

      const namePart = nameMatch[1];
      let typePart = withoutDefault.slice(0, nameMatch.index).trim();
      const isNullable = typePart.endsWith('?');
      if (isNullable) typePart = typePart.slice(0, -1).trim();

      let jsonName: string | undefined;
      if (attrMatch) {
        const jsonAttr = attrMatch[1].match(/JsonProperty(?:Name)?\s*\(\s*["']([^"']+)["']\s*\)/);
        if (jsonAttr) jsonName = jsonAttr[1];
      }

      properties.push({
        name: namePart,
        type: typePart,
        nullable: isNullable,
        jsonName
      });
    }

    found.push({ index: m.index, name: typeName, kind: 'record', properties });
  }

  // 2. Enums: (public)? enum Name { Member1, Member2 }
  const enumRegex = /(?:public|internal|private)?\s*enum\s+(\w+)\s*\{([^}]*)\}/g;
  while ((m = enumRegex.exec(clean))) {
    const typeName = m[1];
    const enumBody = m[2];
    const enumValues = enumBody
      .split(',')
      .map(v => v.split('=')[0].trim())
      .filter(v => Boolean(v) && !v.startsWith('//'));

    found.push({
      index: m.index,
      name: typeName,
      kind: 'enum',
      properties: [],
      enumValues
    });
  }

  // 3. Body-based types: (class|record|struct) Name { ... }
  const bodyTypeRegex = /(?:public|internal|private)?\s*(?:class|record|struct)\s+(\w+)(?:<[^>]+>)?(?:\s*:\s*[^{]+)?\s*\{/g;
  while ((m = bodyTypeRegex.exec(clean))) {
    const typeName = m[1];
    const bodyStart = m.index + m[0].length - 1;
    const bodyEnd = findMatchingBrace(clean, bodyStart);
    if (bodyEnd < 0) continue;

    const body = clean.slice(bodyStart + 1, bodyEnd);
    const properties = parsePropertiesFromBody(body);

    found.push({ index: m.index, name: typeName, kind: 'class', properties });
  }

  // Sort by appearance in source so root type is first declared type
  found.sort((a, b) => a.index - b.index);

  const types = new Map<string, CsharpType>();
  for (const item of found) {
    types.set(item.name, item);
  }
  return types;
}

function splitParameters(paramStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < paramStr.length; i++) {
    const ch = paramStr[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;

    if (ch === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

function findMatchingBrace(source: string, openingBrace: number): number {
  let depth = 0;
  for (let index = openingBrace; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return index;
  }
  return -1;
}

function parsePropertiesFromBody(body: string): CsharpProperty[] {
  const properties: CsharpProperty[] = [];
  const propRegex = /(?:\[([^\]]+)\]\s*)*(?:(?:public|internal|private|protected|required|virtual|override|readonly|static|new)\s+)*([\w<>?,\[\] ]+?)\s+(\w+)\s*(?:\{[^}]*\}|=>[^;]*;|=([^;]+);|;)/g;

  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(body))) {
    const rawAttr = match[1];
    let rawType = match[2]?.trim();
    const propName = match[3]?.trim();
    const defaultVal = match[4]?.trim();

    if (!rawType || !propName) continue;
    if (['void', 'return', 'class', 'struct', 'record', 'enum', 'get', 'set'].includes(rawType)) continue;

    // Clean modifiers from rawType if any remained
    rawType = rawType.replace(/\b(public|internal|private|protected|required|virtual|override|readonly|static|new)\b\s*/g, '').trim();

    const isNullable = rawType.endsWith('?');
    if (isNullable) rawType = rawType.slice(0, -1).trim();

    let jsonName: string | undefined;
    if (rawAttr) {
      const jsonAttr = rawAttr.match(/JsonProperty(?:Name)?\s*\(\s*["']([^"']+)["']\s*\)/);
      if (jsonAttr) jsonName = jsonAttr[1];
    }

    properties.push({
      name: propName,
      type: rawType,
      nullable: isNullable,
      jsonName,
      defaultVal
    });
  }

  return properties;
}

function sampleValue(
  type: string,
  nullable: boolean,
  typesMap: Map<string, CsharpType>,
  casing: CsharpToJsonOptions['casing'] = 'camel',
  visited = new Set<string>()
): unknown {
  if (nullable) return null;

  // Dictionaries
  const dict = type.match(/^(?:Dictionary|IDictionary|IReadOnlyDictionary)<([^,]+),\s*(.+)>$/);
  if (dict) {
    const valType = dict[2].trim();
    return {
      key: sampleValue(valType, false, typesMap, casing, visited)
    };
  }

  // Collections & Arrays
  const collection = type.match(/^(?:List|IList|IReadOnlyList|ICollection|IReadOnlyCollection|IEnumerable|ISet|HashSet)<(.+)>$/);
  if (collection) {
    return [sampleValue(collection[1].trim(), false, typesMap, casing, visited)];
  }
  if (type.endsWith('[]')) {
    return [sampleValue(type.slice(0, -2).trim(), false, typesMap, casing, visited)];
  }

  // Primitives
  if (/^(bool|boolean)$/i.test(type)) return true;
  if (/^(int|long|short|byte|sbyte|uint|ulong|ushort|float|double|decimal)$/i.test(type)) return 0;
  if (/^(DateTime|DateTimeOffset)$/i.test(type)) return '2026-01-01T00:00:00Z';
  if (/^DateOnly$/i.test(type)) return '2026-01-01';
  if (/^(TimeOnly|TimeSpan)$/i.test(type)) return '00:00:00';
  if (/^Guid$/i.test(type)) return '00000000-0000-0000-0000-000000000000';
  if (/^Uri$/i.test(type)) return 'https://example.com';
  if (/^char$/i.test(type)) return 'a';
  if (/^(object|dynamic|JsonElement|JsonObject|JObject)$/i.test(type)) return {};
  if (/^(JsonArray|JArray)$/i.test(type)) return [];
  if (/^string$/i.test(type)) return 'string';

  // Custom types from typesMap
  if (typesMap && typesMap.has(type)) {
    const customType = typesMap.get(type)!;
    if (customType.kind === 'enum') {
      return customType.enumValues?.[0] ?? 'Value';
    }

    if (visited.has(type)) return null; // Avoid circular reference
    visited.add(type);
    const obj: Record<string, unknown> = {};
    for (const p of customType.properties) {
      const propKey = p.jsonName || formatKey(p.name, casing);
      obj[propKey] = sampleValue(p.type, p.nullable, typesMap, casing, new Set(visited));
    }
    return obj;
  }

  return 'string';
}

function formatKey(name: string, casing: CsharpToJsonOptions['casing']): string {
  if (!name) return '';
  switch (casing) {
    case 'pascal':
      return name.charAt(0).toUpperCase() + name.slice(1);
    case 'preserve':
      return name;
    case 'snake':
      return name
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
    case 'camel':
    default:
      return name.charAt(0).toLowerCase() + name.slice(1);
  }
}
